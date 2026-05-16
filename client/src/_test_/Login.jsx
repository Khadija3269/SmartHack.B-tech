import Login from "../components/Login";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "../redux/store";
import "@testing-library/jest-dom";

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        message: "Login successful ✅",
        user: {
          role: "user",
        },
      }),
  })
);

describe("Login Page Testing", () => {

  it("Should render login button", () => {

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    );

    const btn = screen.getByTestId("login-btn");

    expect(btn).toBeInTheDocument();
  });

  it("Should allow typing email", () => {

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    );

    const emailInput = screen.getByTestId("login-email");

    fireEvent.change(emailInput, {
      target: { value: "admin@gmail.com" },
    });

    expect(emailInput.value).toBe("admin@gmail.com");
  });

  it("Should allow typing password", () => {

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    );

    const passwordInput = screen.getByTestId("login-password");

    fireEvent.change(passwordInput, {
      target: { value: "123456" },
    });

    expect(passwordInput.value).toBe("123456");
  });

});
