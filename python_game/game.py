from __future__ import annotations

from dataclasses import dataclass
from math import hypot

import pygame

from python_game.settings import GameConfig


@dataclass(frozen=True)
class Player:
    x: float
    y: float
    size: int
    speed: float


@dataclass(frozen=True)
class Collectible:
    x: float
    y: float
    radius: int


@dataclass(frozen=True)
class GameState:
    player: Player
    collectible: Collectible
    score: int = 0
    running: bool = True


DIRECTIONS: dict[int, tuple[int, int]] = {
    pygame.K_w: (0, -1),
    pygame.K_UP: (0, -1),
    pygame.K_s: (0, 1),
    pygame.K_DOWN: (0, 1),
    pygame.K_a: (-1, 0),
    pygame.K_LEFT: (-1, 0),
    pygame.K_d: (1, 0),
    pygame.K_RIGHT: (1, 0),
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def create_initial_state(config: GameConfig) -> GameState:
    return GameState(
        player=Player(
            x=config.width / 2,
            y=config.height / 2,
            size=config.player_size,
            speed=config.player_speed,
        ),
        collectible=next_collectible(config, 0),
    )


def next_collectible(config: GameConfig, score: int) -> Collectible:
    positions = (
        (config.width * 0.22, config.height * 0.28),
        (config.width * 0.78, config.height * 0.25),
        (config.width * 0.70, config.height * 0.75),
        (config.width * 0.30, config.height * 0.72),
    )
    x, y = positions[score % len(positions)]
    return Collectible(x=x, y=y, radius=config.collectible_radius)


def direction_from_pressed_keys(keys: pygame.key.ScancodeWrapper) -> tuple[float, float]:
    dx = 0
    dy = 0
    for key, vector in DIRECTIONS.items():
        if keys[key]:
            dx += vector[0]
            dy += vector[1]

    if dx == 0 and dy == 0:
        return (0.0, 0.0)

    length = hypot(dx, dy)
    return (dx / length, dy / length)


def move_player(
    player: Player,
    config: GameConfig,
    direction: tuple[float, float],
    dt: float,
) -> Player:
    half_size = player.size / 2
    next_x = player.x + direction[0] * player.speed * dt
    next_y = player.y + direction[1] * player.speed * dt

    return Player(
        x=clamp(next_x, half_size, config.width - half_size),
        y=clamp(next_y, half_size, config.height - half_size),
        size=player.size,
        speed=player.speed,
    )


def player_touches_collectible(player: Player, collectible: Collectible) -> bool:
    player_radius = player.size / 2
    return hypot(player.x - collectible.x, player.y - collectible.y) <= (
        player_radius + collectible.radius
    )


def update_state(
    state: GameState,
    config: GameConfig,
    direction: tuple[float, float],
    dt: float,
) -> GameState:
    moved_player = move_player(state.player, config, direction, dt)
    if not player_touches_collectible(moved_player, state.collectible):
        return GameState(
            player=moved_player,
            collectible=state.collectible,
            score=state.score,
            running=state.running,
        )

    next_score = state.score + 1
    return GameState(
        player=moved_player,
        collectible=next_collectible(config, next_score),
        score=next_score,
        running=state.running,
    )


class Game:
    def __init__(self, config: GameConfig | None = None) -> None:
        self.config = config or GameConfig()
        pygame.init()
        pygame.display.set_caption(self.config.title)
        self.screen = pygame.display.set_mode((self.config.width, self.config.height))
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)
        self.state = create_initial_state(self.config)

    def handle_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.state = GameState(
                    player=self.state.player,
                    collectible=self.state.collectible,
                    score=self.state.score,
                    running=False,
                )

    def update(self, dt: float) -> None:
        keys = pygame.key.get_pressed()
        self.state = update_state(self.state, self.config, direction_from_pressed_keys(keys), dt)

    def draw(self) -> None:
        self.screen.fill(self.config.background_color)
        pygame.draw.circle(
            self.screen,
            self.config.collectible_color,
            (round(self.state.collectible.x), round(self.state.collectible.y)),
            self.state.collectible.radius,
        )
        player_rect = pygame.Rect(0, 0, self.state.player.size, self.state.player.size)
        player_rect.center = (round(self.state.player.x), round(self.state.player.y))
        pygame.draw.rect(self.screen, self.config.player_color, player_rect, border_radius=8)

        label = self.font.render(f"Score: {self.state.score}", True, (245, 247, 255))
        self.screen.blit(label, (24, 22))
        pygame.display.flip()

    def run(self) -> None:
        while self.state.running:
            dt = self.clock.tick(self.config.frames_per_second) / 1000
            self.handle_events()
            self.update(dt)
            self.draw()
        pygame.quit()


def main() -> None:
    Game().run()


if __name__ == "__main__":
    main()
