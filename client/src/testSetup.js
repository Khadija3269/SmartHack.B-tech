// Runs once before the test suite. Enables jest-dom's extra matchers
// (toBeInTheDocument, toHaveTextContent, etc.) for any component tests,
// and gives every test file access to jsdom's window/localStorage/document.
import "@testing-library/jest-dom";


// Hide the React Router v6 "future flag" notices so the test output stays clean.
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("React Router Future Flag Warning")) return;
  originalWarn(...args);
};
