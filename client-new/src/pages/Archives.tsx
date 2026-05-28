import HistoryGallery from '../components/HistoryGallery';

const Archives = () => {
  return (
    <div className="w-full max-w-6xl animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black italic tracking-tighter text-slate-100">
          THE <span className="text-blue-500">ARCHIVES</span>
        </h1>
        <p className="text-slate-500 font-mono text-[10px] mt-2 uppercase tracking-[0.4em]">
          Persistent Multi-Modal Memory Bank
        </p>
      </div>

      {/* Renders the gallery we just updated */}
      <HistoryGallery />
    </div>
  );
};

export default Archives;