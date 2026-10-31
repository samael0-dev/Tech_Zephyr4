// src/App.jsx
import AppRouter from './app/router';
import { Toaster } from './components/common/Toaster';

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
