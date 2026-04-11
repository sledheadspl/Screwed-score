import { ReactNode } from "react";
import Header from "./Header";

interface Props {
  children: ReactNode;
}

export default function MainContent({ children }: Props) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
