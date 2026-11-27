/** Reads a line from the terminal without showing it (prints * per character). */
export async function askHidden(prompt: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY)
    throw new Error("Password input needs an interactive terminal.");
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          stdout.write("\n");
          return reject(new Error("Cancelled."));
        }
        if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        value += ch;
        stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}
