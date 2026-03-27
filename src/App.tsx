import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { Home } from "./pages/Home";
import { Convert } from "./pages/Convert";
import { Trim } from "./pages/Trim";
import { Compress } from "./pages/Compress";
import { Merge } from "./pages/Merge";
import { ExtractAudio } from "./pages/ExtractAudio";
import { Subtitles } from "./pages/Subtitles";
import { useJobEvents } from "./hooks/useJobEvents";

function App() {
  useJobEvents();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="convert" element={<Convert />} />
          <Route path="trim" element={<Trim />} />
          <Route path="compress" element={<Compress />} />
          <Route path="merge" element={<Merge />} />
          <Route path="extract-audio" element={<ExtractAudio />} />
          <Route path="subtitles" element={<Subtitles />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
