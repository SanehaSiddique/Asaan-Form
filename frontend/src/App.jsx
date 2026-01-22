// App.jsx use only redux using react-redux Provider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import AppContent from "./AppContent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <AppContent />
    </Provider>
  </QueryClientProvider>
);

export default App;