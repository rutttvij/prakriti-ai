import json
from pathlib import Path

import app.api.waste_reporting as wr


class _DummyImage:
    def convert(self, _mode):
        return self


class _DummyInput:
    def unsqueeze(self, _):
        return self

    def to(self, _device):
        return self


class _DummyTransformModule:
    @staticmethod
    def Resize(_):
        return object()

    @staticmethod
    def ToTensor():
        return object()

    @staticmethod
    def Normalize(mean=None, std=None):
        _ = (mean, std)
        return object()

    class Compose:
        def __init__(self, _steps):
            pass

        def __call__(self, _img):
            return _DummyInput()


class _DummyProbs:
    def __init__(self, vals):
        self.vals = vals

    def __getitem__(self, idx):
        return self.vals[idx]

    def argmax(self):
        best_i = 0
        best_v = self.vals[0]
        for i, v in enumerate(self.vals):
            if v > best_v:
                best_i = i
                best_v = v
        return best_i

    def cpu(self):
        return self

    def tolist(self):
        return list(self.vals)


class _DummyNoGrad:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        _ = (exc_type, exc, tb)
        return False


class _DummyModel:
    def to(self, _device):
        return self

    def eval(self):
        return self

    def load_state_dict(self, _state_dict, strict=False):
        _ = strict
        return type("_LoadResult", (), {"unexpected_keys": []})()

    def __call__(self, _x):
        return "logits"


class _DummyTorch:
    class cuda:
        @staticmethod
        def is_available():
            return False

    class nn:
        class Module:
            pass

    class jit:
        class ScriptModule:
            pass

    @staticmethod
    def device(name):
        return name

    @staticmethod
    def load(_path, map_location=None):
        _ = map_location
        return {"state_dict": {"weight": 1}}

    @staticmethod
    def softmax(_logits, dim=1):
        _ = dim
        return [_DummyProbs([0.05, 0.95])]

    @staticmethod
    def no_grad():
        return _DummyNoGrad()


def _set_paths(monkeypatch, tmp_path: Path, *, include_class_map: bool):
    model_path = tmp_path / "best_convnext.pt"
    model_path.write_bytes(b"fake")
    monkeypatch.setattr(wr.settings, "ML_MODEL_PATH", str(model_path))

    class_map_path = tmp_path / "class_to_idx.json"
    monkeypatch.setattr(wr.settings, "ML_CLASS_MAP_PATH", str(class_map_path))
    if include_class_map:
        class_map_path.write_text(json.dumps({label: i for i, label in enumerate(wr.WASTE_CLASS_IDS)}), encoding="utf-8")



def test_missing_class_map_triggers_fallback(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=False)
    monkeypatch.setattr(wr, "torch", _DummyTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))

    out = wr.classify_image_with_model(b"bytes")
    assert out.guidance_source in {"label_metadata", "fallback"}
    assert out.id == "plastic_water_bottles"



def test_invalid_class_map_triggers_fallback(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=True)
    class_map_path = Path(wr.settings.ML_CLASS_MAP_PATH)
    class_map_path.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(wr, "torch", _DummyTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))

    out = wr.classify_image_with_model(b"bytes")
    assert out.id == "plastic_water_bottles"



def test_corrupt_model_file_triggers_fallback(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=True)

    class _CorruptTorch(_DummyTorch):
        @staticmethod
        def load(_path, map_location=None):
            _ = map_location
            raise RuntimeError("corrupt model")

    monkeypatch.setattr(wr, "torch", _CorruptTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))

    out = wr.classify_image_with_model(b"bytes")
    assert out.id == "plastic_water_bottles"



def test_valid_model_and_class_map_returns_non_fallback(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=True)

    monkeypatch.setattr(wr, "torch", _DummyTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))
    monkeypatch.setattr(wr, "_build_model", lambda arch, num_classes: _DummyModel())

    out = wr.classify_image_with_model(b"bytes")
    assert out.id == wr.WASTE_CLASS_IDS[1]
    assert out.model_version == wr.settings.ML_MODEL_VERSION
    assert 0.0 <= float(out.confidence or 0.0) <= 1.0


def test_efficientnetv2_arch_uses_timm_builder(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=True)
    monkeypatch.setattr(wr.settings, "ML_MODEL_ARCH", "efficientnetv2")

    captured = {}

    class _DummyTimm:
        @staticmethod
        def create_model(name, pretrained=False, num_classes=0):
            captured["name"] = name
            captured["pretrained"] = pretrained
            captured["num_classes"] = num_classes
            return _DummyModel()

    monkeypatch.setattr(wr, "timm", _DummyTimm)
    monkeypatch.setattr(wr, "torch", _DummyTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))

    out = wr.classify_image_with_model(b"bytes")

    assert captured["name"] == "tf_efficientnetv2_s"
    assert captured["pretrained"] is False
    assert captured["num_classes"] == len(wr.WASTE_CLASS_IDS)
    assert out.id == wr.WASTE_CLASS_IDS[1]


def test_efficientnetv2_arch_alias_uses_timm_builder(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=True)
    monkeypatch.setattr(wr.settings, "ML_MODEL_ARCH", "tf_efficientnetv2_s")

    captured = {}

    class _DummyTimm:
        @staticmethod
        def create_model(name, pretrained=False, num_classes=0):
            captured["name"] = name
            captured["pretrained"] = pretrained
            captured["num_classes"] = num_classes
            return _DummyModel()

    monkeypatch.setattr(wr, "timm", _DummyTimm)
    monkeypatch.setattr(wr, "torch", _DummyTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))

    out = wr.classify_image_with_model(b"bytes")

    assert captured["name"] == "tf_efficientnetv2_s"
    assert captured["pretrained"] is False
    assert captured["num_classes"] == len(wr.WASTE_CLASS_IDS)
    assert out.id == wr.WASTE_CLASS_IDS[1]


def test_invalid_arch_triggers_fallback(monkeypatch, tmp_path):
    _set_paths(monkeypatch, tmp_path, include_class_map=True)
    monkeypatch.setattr(wr.settings, "ML_MODEL_ARCH", "invalid_arch")

    monkeypatch.setattr(wr, "torch", _DummyTorch)
    monkeypatch.setattr(wr, "T", _DummyTransformModule)
    monkeypatch.setattr(wr, "Image", type("_Img", (), {"open": staticmethod(lambda _buf: _DummyImage())}))

    out = wr.classify_image_with_model(b"bytes")
    assert out.id == "plastic_water_bottles"
