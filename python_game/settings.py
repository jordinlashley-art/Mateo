from dataclasses import dataclass


@dataclass(frozen=True)
class GameConfig:
    """Runtime settings for the starter game."""

    width: int = 960
    height: int = 540
    title: str = "Python Game Starter"
    background_color: tuple[int, int, int] = (18, 20, 32)
    player_color: tuple[int, int, int] = (98, 211, 255)
    collectible_color: tuple[int, int, int] = (255, 207, 87)
    frames_per_second: int = 60
    player_speed: float = 280.0
    player_size: int = 34
    collectible_radius: int = 16
