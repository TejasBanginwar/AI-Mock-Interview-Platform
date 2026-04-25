import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Practice from "./pages/Practice";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/practice"
            element={(
              <ProtectedRoute>
                <Practice />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/interview"
            element={(
              <ProtectedRoute>
                <Interview />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/results"
            element={(
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/sign-in/*"
            element={(
              <>
                <SignedOut>
                  <SignInPage />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/practice" replace />
                </SignedIn>
              </>
            )}
          />
          <Route
            path="/sign-up/*"
            element={(
              <>
                <SignedOut>
                  <SignUpPage />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/practice" replace />
                </SignedIn>
              </>
            )}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
