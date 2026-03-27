import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { Home } from "./pages/Home";
import { Convert } from "./pages/Convert";
// Placholders
const Trim = () => <div className="p-4">Trim Placeholder</div>;
const Compress = () => <div className="p-4">Compress Placeholder</div>;
const Merge = () => <div className="p-4">Merge Placeholder</div>;
const ExtractAudio = () => <div className="p-4">Extract Audio Placeholder</div>;
const Subtitles = () => <div className="p-4">Subtitles Placeholder</div>;

function App() {
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
