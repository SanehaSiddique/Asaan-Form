import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import API from "../../axiosInstance";

const Chatbot = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [missingFieldsLoaded, setMissingFieldsLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const userId = user?.id ?? user?._id ?? null;

  // Extract formId and documentId from URL if in workspace
  const pathMatch = location.pathname.match(
    /\/(form-workspace|document-review)\/([^/]+)\/([^/]+)/
  );
  const formId = pathMatch ? pathMatch[2] : null;
  const documentId = pathMatch ? pathMatch[3] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when chatbot is opened
  const loadHistory = useCallback(async () => {
    if (!userId || historyLoaded) return;
    try {
      const response = await API.get(`chatbot/history/${userId}?limit=50`);
      const history = response.data?.messages || [];
      if (history.length > 0) {
        const loaded = history.map((msg) => ({
          id: msg._id || crypto.randomUUID(),
          text: msg.text,
          sender: msg.sender,
          timestamp: new Date(msg.createdAt),
          metadata: msg.metadata || {},
        }));
        setMessages(loaded);
      } else {
        // Show welcome message only if no history
        setMessages([
          {
            id: "welcome",
            text: "Hi! I'm ASAAN AI, your form assistant. Ask me anything about your forms or documents.",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      }
      setHistoryLoaded(true);
    } catch (error) {
      console.error("Failed to load chat history:", error);
      setMessages([
        {
          id: "welcome",
          text: "Hi! I'm ASAAN AI, your form assistant. Ask me anything about your forms or documents.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      setHistoryLoaded(true);
    }
  }, [userId, historyLoaded]);

  // Reset state when user changes (e.g., logout/login)
  useEffect(() => {
    setMessages([]);
    setHistoryLoaded(false);
    setMissingFieldsLoaded(false);
    setMissingFields([]);
  }, [userId]);

  // Load missing fields when in form workspace
  const loadMissingFields = useCallback(async () => {
    if (!formId || !documentId || missingFieldsLoaded) return;
    try {
      const response = await API.get(
        `chatbot/missing-fields/${formId}/${documentId}`
      );
      const data = response.data;
      if (data.missingFields && data.missingFields.length > 0) {
        setMissingFields(data.missingFields);
        
        // Notify the user globally via toast
        toast.warning(`Found ${data.missingCount} missing fields that need your attention!`);

        // Add a bot message about missing fields
        const fieldList = data.missingFields
          .map((f) => `• **${f.field_name}**`)
          .join("\n");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: `I found **${data.missingCount}** missing fields in your form "${data.formName || "form"}":\n\n${fieldList}\n\nYou can tell me the values and I'll update the form for you! For example: "My father's occupation is Doctor"`,
            sender: "bot",
            timestamp: new Date(),
            metadata: { type: "missing_fields" },
          },
        ]);
      }
      setMissingFieldsLoaded(true);
    } catch (error) {
      console.error("Failed to load missing fields:", error);
      setMissingFieldsLoaded(true);
    }
  }, [formId, documentId, missingFieldsLoaded]);

  useEffect(() => {
    if (isOpen && userId) {
      loadHistory();
    }
  }, [isOpen, userId, loadHistory]);

  useEffect(() => {
    if (isOpen && historyLoaded && formId && documentId) {
      loadMissingFields();
    }
  }, [isOpen, historyLoaded, formId, documentId, loadMissingFields]);

  // Reset missing fields state when URL changes
  useEffect(() => {
    setMissingFieldsLoaded(false);
    setMissingFields([]);
  }, [formId, documentId]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;

    const userMessage = {
      id: crypto.randomUUID(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    try {
      setLoading(true);

      const payload = {
        question: currentInput.trim(),
        userId,
        collection_name: `user_${userId}`,
        formId: formId || undefined,
        documentId: documentId || undefined,
      };

      const response = await API.post("chatbot/ask", payload);
      console.log("[Chatbot] 📥 API Response:", response.data);

      const { answer, sources, field_update, field_updates } =
        response.data || {};

      const botMessage = {
        id: crypto.randomUUID(),
        text: answer || "Sorry, I could not generate a response.",
        sender: "bot",
        timestamp: new Date(),
        metadata: { sources, field_update, field_updates },
      };
      setMessages((prev) => [...prev, botMessage]);

      // Process all field updates (prefer the new array format)
      const updates = field_updates || (field_update ? [field_update] : []);
      
      if (updates.length > 0) {
        console.log(`[Chatbot] 🔄 Processing ${updates.length} updates...`);
        
        updates.forEach(update => {
          if (update.field_key) {
            // Show confirmation toast for each update
            toast.success(`Updated ${update.field_key}! ✨`);

            // Remove this field from missing fields list
            setMissingFields((prev) =>
              prev.filter((f) => f.field_key !== update.field_key)
            );

            // Dispatch a custom event so the form workspace can update its UI
            const event = new CustomEvent("fieldUpdated", {
              detail: {
                field_key: update.field_key,
                value: update.value
              }
            });
            window.dispatchEvent(event);
          }
        });
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: "Sorry, I ran into a problem answering that. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!userId) return;
    try {
      await API.delete(`chatbot/history/${userId}`);
      setMessages([
        {
          id: "welcome",
          text: "Chat history cleared. How can I help you?",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      setMissingFieldsLoaded(false);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown-like rendering for bold text
  const renderText = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
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
        {missingFields.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white text-white text-xs flex items-center justify-center font-bold">
            {missingFields.length}
          </span>
        )}
        {missingFields.length === 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-100px)] rounded-2xl overflow-hidden shadow-large flex flex-col bg-card border border-border"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-asaan-steel to-asaan-royal p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">ASAAN AI</h4>
                  <p className="text-xs text-white/70">
                    {formId
                      ? "Form assistant mode"
                      : "Always here to help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClearHistory}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="w-4 h-4 text-white/70" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Context indicator */}
            {formId && (
              <div className="px-4 py-2 bg-blue-500/10 border-b border-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Form context active
                  {missingFields.length > 0 &&
                    ` · ${missingFields.length} missing fields`}
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  className={`flex gap-2 ${
                    message.sender === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === "user"
                        ? "bg-primary"
                        : message.metadata?.type === "field_update_confirmation"
                        ? "bg-green-500"
                        : "bg-gradient-to-br from-asaan-sky to-asaan-steel"
                    }`}
                  >
                    {message.sender === "user" ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : message.metadata?.type ===
                      "field_update_confirmation" ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : message.metadata?.type ===
                          "field_update_confirmation"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 rounded-tl-sm border border-green-500/20"
                        : "bg-secondary text-foreground rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">
                      {renderText(message.text)}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-asaan-sky to-asaan-steel flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="bg-secondary p-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    !user
                      ? "Login to chat..."
                      : missingFields.length > 0
                      ? "Type a value for a missing field..."
                      : "Ask about your forms or documents..."
                  }
                  className="flex-1 px-4 py-2 rounded-xl bg-secondary border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  disabled={loading || !user}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || loading || !user}
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
