from python_game.game import (
    GameState,
    Player,
    create_initial_state,
    move_player,
    next_collectible,
    player_touches_collectible,
    update_state,
)
from python_game.settings import GameConfig


def test_initial_state_starts_player_in_center() -> None:
    config = GameConfig(width=800, height=600)
    state = create_initial_state(config)

    assert state.player.x == 400
    assert state.player.y == 300
    assert state.score == 0
    assert state.running is True


def test_player_movement_is_clamped_to_window_bounds() -> None:
    config = GameConfig(width=200, height=120, player_size=20, player_speed=500)
    player = Player(x=10, y=10, size=20, speed=500)

    moved = move_player(player, config, direction=(-1, -1), dt=1)

    assert moved.x == 10
    assert moved.y == 10


def test_collecting_item_increments_score_and_moves_collectible() -> None:
    config = GameConfig(width=800, height=600)
    collectible = next_collectible(config, 0)
    state = GameState(
        player=Player(
            x=collectible.x,
            y=collectible.y,
            size=config.player_size,
            speed=config.player_speed,
        ),
        collectible=collectible,
    )

    updated = update_state(state, config, direction=(0, 0), dt=0)

    assert updated.score == 1
    assert updated.collectible == next_collectible(config, 1)


def test_player_touches_collectible_uses_player_size_and_radius() -> None:
    player = Player(x=50, y=50, size=20, speed=100)

    near_collectible = next_collectible(GameConfig(width=228, height=179), 0)
    far_collectible = next_collectible(GameConfig(width=1200, height=900), 1)

    assert player_touches_collectible(player, near_collectible)
    assert not player_touches_collectible(player, far_collectible)
