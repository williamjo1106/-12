import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { socket } from "./lib/socket";
import { Trophy, Users, Play, RotateCcw, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

type Participant = {
  id: string;
  name: string;
  numbers: number[];
  matchCount?: number;
  isBonusMatch?: boolean;
  rank?: number;
};

export default function App() {
  const [name, setName] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [bonusNumber, setBonusNumber] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawIndex, setCurrentDrawIndex] = useState(-1);
  const [results, setResults] = useState<Participant[] | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [showHostLogin, setShowHostLogin] = useState(false);
  const [hostPassword, setHostPassword] = useState("");
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    socket.on("state_update", (state) => {
      setParticipants(state.participants);
      setWinningNumbers(state.winningNumbers);
      setBonusNumber(state.bonusNumber);
      setIsDrawing(state.isDrawing);
      setCurrentDrawIndex(state.currentDrawIndex);
    });

    socket.on("participants_update", (data) => {
      setParticipants(data);
    });

    socket.on("draw_started", ({ winningNumbers, bonusNumber }) => {
      setWinningNumbers(winningNumbers);
      setBonusNumber(bonusNumber);
      setIsDrawing(true);
      setCurrentDrawIndex(-1);
      setResults(null);
    });

    socket.on("ball_drawn", ({ index }) => {
      setCurrentDrawIndex(index);
    });

    socket.on("draw_finalized", ({ winningNumbers, bonusNumber }) => {
      setWinningNumbers(winningNumbers);
      setBonusNumber(bonusNumber);
    });

    socket.on("draw_finished", ({ results }) => {
      setIsDrawing(false);
      setResults(results.sort((a: Participant, b: Participant) => {
        if (a.rank === 0) return 1;
        if (b.rank === 0) return -1;
        return (a.rank || 99) - (b.rank || 99);
      }));
    });

    socket.on("game_reset", () => {
      setParticipants([]);
      setWinningNumbers([]);
      setBonusNumber(null);
      setIsDrawing(false);
      setCurrentDrawIndex(-1);
      setResults(null);
      setIsJoined(false);
      setSelectedNumbers([]);
    });

    return () => {
      socket.off("state_update");
      socket.off("participants_update");
      socket.off("draw_started");
      socket.off("ball_drawn");
      socket.off("draw_finished");
      socket.off("game_reset");
    };
  }, []);

  const handleJoin = () => {
    if (name && selectedNumbers.length === 6) {
      socket.emit("join_game", { name, numbers: selectedNumbers });
      setIsJoined(true);
    }
  };

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else if (selectedNumbers.length < 6) {
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  const startDraw = () => {
    socket.emit("start_draw");
  };

  const resetGame = () => {
    socket.emit("reset_game");
  };

  const handleHostLogin = () => {
    if (hostPassword === "9207") {
      setIsHost(true);
      setIsJoined(true);
      setShowHostLogin(false);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const handleRemoveParticipant = (id: string) => {
    if (confirm("정말 이 참가자를 삭제하시겠습니까?")) {
      socket.emit("remove_participant", id);
    }
  };

  const handleUpdateParticipant = () => {
    if (editingParticipant) {
      socket.emit("update_participant", editingParticipant);
      setEditingParticipant(null);
    }
  };

  const myParticipant = participants.find(p => p.id === socket.id);

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest mb-4"
          >
            <Sparkles size={14} />
            Real-Time Lotto Party
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            LOTTO PARTY
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            친구들과 함께 번호를 고르고 실시간 추첨을 지켜보세요. 1등의 주인공은 누구일까요?
          </p>
        </header>

        <main className="space-y-8">
          {!isJoined ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                {showHostLogin ? (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-center text-orange-400">Host Login</h2>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">비밀번호</label>
                      <input 
                        type="password" 
                        value={hostPassword}
                        onChange={(e) => setHostPassword(e.target.value)}
                        placeholder="비밀번호를 입력하세요"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xl focus:outline-none focus:border-orange-500/50 transition-colors"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleHostLogin}
                        className="flex-1 py-4 rounded-xl bg-orange-500 font-bold text-lg hover:bg-orange-400 transition-all"
                      >
                        로그인
                      </button>
                      <button
                        onClick={() => setShowHostLogin(false)}
                        className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 font-bold text-lg hover:bg-white/10 transition-all"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">당신의 이름</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름을 입력하세요"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xl focus:outline-none focus:border-orange-500/50 transition-colors"
                      />
                    </div>

                    <div className="mb-8">
                      <div className="flex justify-between items-end mb-4">
                        <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">번호 선택 (6개)</label>
                        <span className="text-orange-400 font-mono text-lg">{selectedNumbers.length} / 6</span>
                      </div>
                      <div className="grid grid-cols-7 md:grid-cols-9 gap-2">
                        {Array.from({ length: 45 }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            onClick={() => toggleNumber(num)}
                            className={`
                              aspect-square rounded-lg text-sm font-bold transition-all duration-200
                              ${selectedNumbers.includes(num) 
                                ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-110 z-10" 
                                : "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5"}
                            `}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      disabled={!name || selectedNumbers.length !== 6}
                      onClick={handleJoin}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 font-bold text-xl shadow-lg shadow-orange-900/20 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      참가하기
                    </button>
                  </>
                )}
              </motion.section>

              {!showHostLogin && (
                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowHostLogin(true)}
                    className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 border border-white/5 hover:bg-white/5 hover:text-orange-400 transition-all"
                  >
                    Enter Host Mode
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Top Drawing Area - Full Width */}
              <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-6">
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${isDrawing ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-green-500/20 text-green-400"}`}>
                    <div className={`w-2 h-2 rounded-full ${isDrawing ? "bg-red-400" : "bg-green-400"}`} />
                    {isDrawing ? "Drawing Live" : "Ready"}
                  </div>
                </div>

                <h2 className="text-3xl font-black mb-12 flex items-center gap-3">
                  <Trophy className="text-orange-500" size={32} />
                  실시간 추첨 현황
                </h2>

                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 min-h-[160px] py-4">
                  <AnimatePresence mode="popLayout">
                    {winningNumbers.map((num, idx) => (
                      <motion.div
                        key={`main-${num}-${idx}`}
                        initial={{ scale: 0, rotate: -180, y: 50 }}
                        animate={{ 
                          scale: idx <= currentDrawIndex ? 1 : 0.5, 
                          rotate: 0, 
                          y: 0,
                          opacity: idx <= currentDrawIndex ? 1 : 0.2
                        }}
                        className={`
                          w-14 h-14 md:w-24 md:h-24 rounded-full flex items-center justify-center text-2xl md:text-4xl font-black shadow-2xl
                          ${idx <= currentDrawIndex 
                            ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white border-2 border-white/30" 
                            : "bg-white/5 text-gray-600 border border-white/10"}
                        `}
                      >
                        {idx <= currentDrawIndex ? num : "?"}
                      </motion.div>
                    ))}
                    
                    {/* Bonus Ball Section */}
                    {(winningNumbers.length > 0 || isDrawing) && (
                      <div className="flex items-center gap-3 md:gap-6 ml-2 md:ml-6 pl-2 md:pl-6 border-l-2 border-white/10">
                        <div className="text-blue-400 font-black text-3xl md:text-5xl">+</div>
                        <motion.div
                          key={`bonus-${bonusNumber}`}
                          initial={{ scale: 0, rotate: -180, y: 50 }}
                          animate={{ 
                            scale: currentDrawIndex === 6 ? 1 : 0.5, 
                            rotate: 0, 
                            y: 0,
                            opacity: currentDrawIndex === 6 ? 1 : 0.2
                          }}
                          className={`
                            w-14 h-14 md:w-24 md:h-24 rounded-full flex items-center justify-center text-2xl md:text-4xl font-black shadow-2xl
                            ${currentDrawIndex === 6 
                              ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white border-2 border-white/30 shadow-[0_0_30px_rgba(37,99,235,0.5)]" 
                              : "bg-white/5 text-gray-600 border border-white/10"}
                          `}
                        >
                          {currentDrawIndex === 6 ? bonusNumber : "?"}
                        </motion.div>
                      </div>
                    )}

                    {winningNumbers.length === 0 && !isDrawing && (
                      <div className="text-gray-500 text-xl italic font-medium">추첨이 시작되기를 기다리고 있습니다...</div>
                    )}
                  </AnimatePresence>
                </div>

                {isHost && !isDrawing && (
                  <div className="mt-12 flex justify-center gap-6">
                    <button
                      onClick={startDraw}
                      className="px-12 py-5 rounded-2xl bg-orange-500 hover:bg-orange-400 font-black text-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-900/40 active:scale-95"
                    >
                      <Play size={28} /> 추첨 시작
                    </button>
                    <button
                      onClick={resetGame}
                      className="px-8 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
                      title="초기화"
                    >
                      <RotateCcw size={28} />
                    </button>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Results Area */}
                <div className="lg:col-span-2 space-y-8">
                  {results && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
                    >
                      <h2 className="text-2xl font-bold mb-6">최종 결과</h2>
                      <div className="space-y-4">
                        {results.map((p, idx) => (
                          <div 
                            key={p.id} 
                            className={`flex items-center justify-between p-4 rounded-2xl border ${p.rank === 1 ? "bg-orange-500/20 border-orange-500/30" : p.rank === 2 ? "bg-blue-500/20 border-blue-500/30" : "bg-white/5 border-white/5"}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${p.rank === 1 ? "bg-orange-500 text-white" : p.rank === 2 ? "bg-blue-500 text-white" : "bg-white/10 text-gray-400"}`}>
                                {p.rank && p.rank > 0 ? `${p.rank}등` : "-"}
                              </div>
                              <div>
                                <div className="font-bold text-lg">{p.name} {p.id === socket.id && "(나)"}</div>
                                <div className="text-sm text-gray-400 flex gap-1">
                                  {p.numbers.map(n => (
                                    <span key={n} className={winningNumbers.includes(n) ? "text-orange-400 font-bold" : n === bonusNumber ? "text-blue-400 font-bold" : ""}>{n}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-orange-400">
                                {p.matchCount}개{p.isBonusMatch && <span className="text-blue-400 text-sm ml-1">+보너스</span>}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-tighter">Matches</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.section>
                  )}
                </div>

                {/* Sidebar: Participants & My Info */}
                <div className="space-y-8">
                  <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Users size={16} />
                        참가자 ({participants.length})
                      </h3>
                      <button 
                        onClick={() => setShowParticipantsModal(true)}
                        className="text-[10px] text-orange-400 hover:underline font-bold uppercase tracking-tighter"
                      >
                        목록 보기
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {participants.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold">
                            {p.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                          </div>
                          {p.id === socket.id && (
                            <div className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">ME</div>
                          )}
                        </div>
                      ))}
                      {participants.length > 5 && (
                        <div className="text-center text-[10px] text-gray-500 py-2">
                          외 {participants.length - 5}명 더 참여 중...
                        </div>
                      )}
                    </div>
                  </section>

                  {myParticipant && !isHost && (
                    <section className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 backdrop-blur-xl border border-orange-500/20 rounded-3xl p-6">
                      <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-4">내 번호</h3>
                      <div className="flex justify-between gap-2">
                        {myParticipant.numbers.map((num) => (
                          <div 
                            key={num} 
                            className={`
                              flex-1 aspect-square rounded-lg flex items-center justify-center font-bold text-sm
                              ${winningNumbers.includes(num) ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : num === bonusNumber ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-white/10 text-gray-300"}
                            `}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="pt-4">
                    {isHost && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                        <div className="text-orange-400 text-xs font-bold uppercase tracking-widest">Host Mode Active</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Participants Modal */}
        <AnimatePresence>
          {showParticipantsModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowParticipantsModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-[#151619] border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="text-orange-500" />
                    참가자 전체 목록 ({participants.length})
                  </h2>
                  <button 
                    onClick={() => setShowParticipantsModal(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <RotateCcw className="rotate-45" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                  {participants.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3 relative group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                            {p.name[0]}
                          </div>
                          <div className="font-bold truncate">{p.name}</div>
                        </div>
                        {isHost && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingParticipant(p)}
                              className="p-1.5 hover:bg-orange-500/20 text-orange-400 rounded transition-colors"
                              title="수정"
                            >
                              <Play size={14} className="rotate-90" />
                            </button>
                            <button 
                              onClick={() => handleRemoveParticipant(p.id)}
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                              title="삭제"
                            >
                              <AlertCircle size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {p.numbers.map(n => (
                          <div key={n} className="flex-1 bg-black/40 rounded py-1 text-center text-[10px] font-mono text-gray-400">
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Participant Modal */}
        <AnimatePresence>
          {editingParticipant && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingParticipant(null)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full max-w-lg bg-[#1a1b1e] border border-orange-500/30 rounded-3xl p-8 shadow-2xl"
              >
                <h2 className="text-2xl font-bold mb-6 text-orange-400">참가자 정보 수정</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">이름</label>
                    <input 
                      type="text" 
                      value={editingParticipant.name}
                      onChange={(e) => setEditingParticipant({...editingParticipant, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">번호 수정 (쉼표로 구분)</label>
                    <input 
                      type="text" 
                      value={editingParticipant.numbers.join(", ")}
                      onChange={(e) => {
                        const nums = e.target.value.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                        setEditingParticipant({...editingParticipant, numbers: nums});
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleUpdateParticipant}
                      className="flex-1 py-4 rounded-xl bg-orange-500 font-bold hover:bg-orange-400 transition-all"
                    >
                      저장하기
                    </button>
                    <button
                      onClick={() => setEditingParticipant(null)}
                      className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <footer className="mt-20 text-center text-gray-600 text-sm">
          <p>© 2026 Lotto Party. Good Luck!</p>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
