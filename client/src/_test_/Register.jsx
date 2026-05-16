import Register from "../components/Register";
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
        message: "User registered successfully ✅",
      }),
  })
);

describe("Register Page Testing", () => {

  it("Should render register button", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>
    );

    const btn = screen.getByTestId("register-btn");
    expect(btn).toBeInTheDocument();
  });

  it("Should allow typing full name", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>
    );

    const input = screen.getByTestId("register-name");

    fireEvent.change(input, {
      target: { value: "Khadija" },
    });

    expect(input.value).toBe("Khadija");
  });

  it("Should allow typing email", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>
    );

    const input = screen.getByTestId("register-email");

    fireEvent.change(input, {
      target: { value: "khadija@gmail.com" },
    });

    expect(input.value).toBe("khadija@gmail.com");
  });

  it("Should allow typing phone number", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>
    );

    const input = screen.getByTestId("register-phone");

    fireEvent.change(input, {
      target: { value: "99999999" },
    });

    expect(input.value).toBe("99999999");
  });

  it("Should allow typing password", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </Provider>
    );

    const input = screen.getByTestId("register-password");

    fireEvent.change(input, {
      target: { value: "123456" },
    });

    expect(input.value).toBe("123456");
  });

});