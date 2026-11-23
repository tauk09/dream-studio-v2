import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { App } from "../App";
import { SandboxedPreview } from "../components/ui/SandboxedPreview";
import { useAuthStore } from "../store/authStore";

describe("Dream Studio 2.0 Web App", () => {
  it("renders the Landing Page with Dream Studio 2.0 hero headline", () => {
    useAuthStore.setState({ user: null, initialized: true });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/상상한 아이디어가/i)).toBeTruthy();
    expect(screen.getByText(/진짜 작품이 되는 곳/i)).toBeTruthy();
  });

  it("redirects unauthenticated users from /app/create to /login", () => {
    useAuthStore.setState({ user: null, initialized: true });
    render(
      <MemoryRouter initialEntries={["/app/create"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("내 스튜디오 로그인")).toBeTruthy();
  });

  it("renders the Create Hub page for authenticated users with Website and Game options", () => {
    useAuthStore.setState({
      user: {
        id: "usr_test",
        email: "student@school.kr",
        displayName: "테스트 학생",
        role: "user",
        createdAt: "2026-11-22T00:00:00Z"
      },
      initialized: true
    });
    render(
      <MemoryRouter initialEntries={["/app/create"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/오늘은 무엇을 만들어 볼까요/i)).toBeTruthy();
    expect(screen.getByText("웹사이트 만들기")).toBeTruthy();
    expect(screen.getByText("게임 만들기")).toBeTruthy();
  });

  it("enforces strict opaque-origin sandbox='allow-scripts' on SandboxedPreview", () => {
    const { container } = render(
      <SandboxedPreview previewHtml="<html><body>Hello</body></html>" title="Test Preview" />
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("sandbox")).toContain("allow-scripts");
    expect(iframe?.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });
});
