import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import API from "../../axiosInstance";

const Chatbot = () => {
  const { user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hi! I'm ASAAN, your AI form assistant. Ask me anything about your forms or documents.",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: crypto.randomUUID(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      setLoading(true);
      const userId = user?.id ?? user?._id ?? "anonymous";
      // Use per-user collection so knowledge and history are isolated
      const collectionName = `user_${userId}`;
      const params = new URLSearchParams();
      params.set("question", input.trim());
      params.set("collection_name", collectionName);

      const response = await API.post(`chatbot/ask?${params.toString()}`);
      const answer = response.data?.answer || "Sorry, I could not generate a response.";

      const botMessage = {
        id: crypto.randomUUID(),
        text: answer,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Chatbot error:", error);
      const botMessage = {
        id: crypto.randomUUID(),
        text: "Sorry, I ran into a problem answering that. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-asaan-sky to-asaan-royal shadow-large flex items-center justify-center ${
          isOpen ? "hidden" : ""
        }`}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-100px)] rounded-2xl overflow-hidden shadow-large flex flex-col bg-card border border-border"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-asaan-steel to-asaan-royal p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">ASAAN AI</h4>
                  <p className="text-xs text-white/70">Always here to help</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex gap-2 ${
                    message.sender === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === "user"
                        ? "bg-primary"
                        : "bg-gradient-to-br from-asaan-sky to-asaan-steel"
                    }`}
                  >
                    {message.sender === "user" ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-secondary text-foreground rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={user ? "Ask about your forms or documents..." : "Login to chat about your forms..."}
                  className="flex-1 px-4 py-2 rounded-xl bg-secondary border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  disabled={loading}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-asaan-steel to-asaan-royal flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
