// src/App.tsx
import Header from "@/components/header/Header";
import Main from "@/components/main/Main";
import CreatePost from "@/components/posts/CreatePost";

import "./App.css";

export default function App() {
  return (
    <>
      <Header />
      <Main />
      <CreatePost />
    </>
  );
}
