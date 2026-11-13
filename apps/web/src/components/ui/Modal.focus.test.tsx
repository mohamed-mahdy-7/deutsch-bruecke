// @vitest-environment jsdom

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Modal } from "./Modal";

describe("Modal input focus", () => {
  it("keeps focus while typing in a controlled input", async () => {
    const user = userEvent.setup();

    function Demo() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState("");
      return (
        <Modal open={open} onClose={() => setOpen(false)} title="Add word">
          <input
            aria-label="word"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Modal>
      );
    }

    render(<Demo />);
    const input = screen.getByLabelText("word");
    await user.click(input);
    await user.type(input, "abc");
    expect((input as HTMLInputElement).value).toBe("abc");
    expect(document.activeElement).toBe(input);
  });
});