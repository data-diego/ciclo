import { useGameStore } from "./game/store";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Results } from "./screens/Results";

function App() {
  const store = useGameStore();

  if (!store.game || store.game.status === "lobby") {
    return <Lobby store={store} />;
  }

  if (store.game.status === "finished") {
    return <Results store={store} />;
  }

  return <Game store={store} />;
}

export default App;
