"""Independent server allowlist, backed by the shipped catalogue, never client HTML."""

import json
import re
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CATALOGUE = json.loads((Path(__file__).parent / "catalogue.json").read_text())
FONT = Literal["fredoka", "pacifico", "quicksand", "poppins", "nunito", "playfair"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Opening(Strict):
    type: Literal["envelope"]
    tone: Literal["theme", "ivory", "blush", "forest", "midnight"]
    wrap: Literal["plain", "striped", "dots"]
    seal: bool
    effect: Literal[
        "theme",
        "balloons",
        "confetti",
        "hearts",
        "snow",
        "flowers",
        "stars",
        "sparkles",
        "fade",
    ]


def utf16(value, limit):
    if len(value.encode("utf-16-le")) // 2 > limit:
        raise ValueError("Text exceeds the static card limit")
    return value


class Physical(Strict):
    paper: Literal["ivory", "linen", "white", "kraft", "pastel", "textured"]
    coverGreeting: str = Field(max_length=160)
    coverName: str | None = Field(default=None, max_length=120)
    coverArt: str = Field(max_length=80)
    insideArt: str = Field(max_length=80)
    handwriting: FONT
    signature: FONT
    effects: bool

    @field_validator("coverName")
    @classmethod
    def name(cls, v):
        if v is None:
            raise ValueError("Cover name must be text when supplied")
        return utf16(v, 120)

    @field_validator("coverGreeting")
    @classmethod
    def greeting(cls, v):
        return utf16(v, 160)


class CardData(Strict):
    v: Literal[5]
    themeId: str
    to: str = Field(max_length=120)
    message: str = Field(max_length=6000)
    from_: str = Field(alias="from", max_length=160)
    fontId: FONT
    textSize: Literal[14, 16, 18, 20] = 18
    watermark: bool = True
    giftUrl: str = Field(default="", max_length=500)
    birthdayNumber: str = Field(default="", max_length=3)
    birthdayNumberEnabled: bool | None = None
    paperOverride: str = ""
    inkOverride: str = ""
    stickerId: str = ""
    openingConfig: Opening
    physicalConfig: Physical

    @field_validator("to", "message", "from_")
    @classmethod
    def limits(cls, v, info):
        return utf16(v, {"to": 120, "message": 6000, "from_": 160}[info.field_name])

    @field_validator("themeId")
    @classmethod
    def theme(cls, v):
        if v not in CATALOGUE:
            raise ValueError("Unknown card design")
        return v

    @field_validator("paperOverride", "inkOverride")
    @classmethod
    def colour(cls, v):
        if v and not re.fullmatch(r"#[0-9a-fA-F]{6}", v):
            raise ValueError("Invalid colour")
        return v

    @field_validator("birthdayNumber")
    @classmethod
    def age(cls, v):
        if v and (not re.fullmatch(r"[0-9]{1,3}", v) or not 1 <= int(v) <= 120):
            raise ValueError("Invalid age")
        return v

    @field_validator("giftUrl")
    @classmethod
    def gift(cls, v):
        if v:
            u = urlsplit(v)
            if (
                u.scheme != "https"
                or not u.hostname
                or u.username
                or u.password
                or any(ord(c) < 32 for c in v)
            ):
                raise ValueError("Invalid gift URL")
        return v

    @model_validator(mode="after")
    def art(self):
        ids = CATALOGUE[self.themeId]["illustrations"]
        if self.stickerId and self.stickerId not in ids:
            raise ValueError("Invalid illustration")
        if self.physicalConfig.coverArt not in ["", "none", *ids]:
            raise ValueError("Invalid cover artwork")
        if self.physicalConfig.insideArt not in ["", "default", *ids]:
            raise ValueError("Invalid inside artwork")
        if self.birthdayNumber and not CATALOGUE[self.themeId]["birthday"]:
            raise ValueError("Age requires birthday design")
        return self


class Photo(Strict):
    mediaId: str = Field(pattern=r"^[a-f0-9-]{36}$")
    kind: Literal["cover", "memory"]
    layout: Literal["framed", "full", "inside"]
    aspect: Literal["square", "portrait"]
    border: Literal["rectangle", "rounded", "paper", "gold"]
    alt: str = Field(default="", max_length=160)

    @field_validator("alt")
    @classmethod
    def alt_limit(cls, v):
        return utf16(v, 160)

    @model_validator(mode="after")
    def layout_kind(self):
        if self.kind == "cover" and self.layout == "inside":
            raise ValueError("Cover photo cannot be inside")
        return self


class HostedDocument(Strict):
    version: Literal[1]
    card: CardData
    photo: Photo

    def document(self):
        return self.model_dump(by_alias=True, exclude_none=True)
