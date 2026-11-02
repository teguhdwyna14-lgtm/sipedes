// Public layout - dengan header & footer

import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '../ui/ToastContainer';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-batik-pattern">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
