// tiny-stack-vm-01 entry: runs /input/<id>/program.bin on input.bin, writes stdout.bin and exit.txt.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STACK_MAX = 256;
const CALL_MAX = 64;
const MEM_WORDS = 256;
const STEP_MAX = 1000000;
const OUT_MAX = 65536;

// opcode table: (imm<<6)|(pops<<3)|pushes, -1 = no opcode
const T = new Int16Array(256).fill(-1);
const OPS = [
  [0x00, 0, 0, 0], [0x01, 1, 0, 1], [0x02, 4, 0, 1], [0x03, 0, 1, 0], [0x04, 0, 1, 2],
  [0x05, 0, 2, 2], [0x06, 0, 2, 3], [0x07, 0, 3, 3], [0x10, 0, 2, 1], [0x11, 0, 2, 1],
  [0x12, 0, 2, 1], [0x13, 0, 2, 1], [0x14, 0, 2, 1], [0x15, 0, 2, 1], [0x16, 0, 2, 1],
  [0x17, 0, 1, 1], [0x18, 0, 2, 1], [0x19, 0, 2, 1], [0x1a, 0, 2, 1], [0x1b, 0, 1, 1],
  [0x1c, 0, 2, 1], [0x1d, 0, 2, 1], [0x1e, 0, 2, 1], [0x20, 0, 2, 1], [0x21, 0, 2, 1],
  [0x22, 0, 2, 1], [0x30, 2, 0, 0], [0x31, 2, 1, 0], [0x32, 2, 1, 0], [0x33, 2, 0, 0],
  [0x34, 0, 0, 0], [0x40, 0, 1, 1], [0x41, 0, 2, 0], [0x50, 0, 1, 0], [0x51, 0, 1, 0],
  [0x52, 0, 0, 1], [0x53, 0, 1, 0],
];
for (const [c, i, p, q] of OPS) T[c] = (i << 6) | (p << 3) | q;

function run(prog: Uint8Array, input: Uint8Array) {
  const n = prog.length;
  const st = new Int32Array(STACK_MAX);
  const calls = new Int32Array(CALL_MAX);
  const mem = new Int32Array(MEM_WORDS);
  const out = Buffer.alloc(OUT_MAX);
  let sp = 0;
  let csp = 0;
  let olen = 0;
  let ip = 0;
  let pc = 0;
  let steps = 0;
  const stop = (code: number) => ({ stdout: out.subarray(0, olen), exit: code });

  for (;;) {
    if (steps === STEP_MAX) return stop(10);
    if (pc < 0 || pc >= n) return stop(9);
    const code = prog[pc];
    const meta = T[code];
    if (meta < 0) return stop(5);
    const imm = meta >> 6;
    if (pc + imm >= n) return stop(9);
    steps++;
    const next = pc + 1 + imm;
    const pops = (meta >> 3) & 7;
    if (sp < pops) return stop(2);
    if (sp - pops + (meta & 7) > STACK_MAX) return stop(3);
    let a = 0;
    let b = 0;
    let rel = 0;
    pc = next;
    switch (code) {
      case 0x00:
        return stop(0);
      case 0x01:
        st[sp++] = (prog[next - 1] << 24) >> 24;
        break;
      case 0x02:
        st[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24);
        break;
      case 0x03:
        sp--;
        break;
      case 0x04:
        st[sp] = st[sp - 1];
        sp++;
        break;
      case 0x05:
        a = st[sp - 1];
        st[sp - 1] = st[sp - 2];
        st[sp - 2] = a;
        break;
      case 0x06:
        st[sp] = st[sp - 2];
        sp++;
        break;
      case 0x07:
        a = st[sp - 3];
        st[sp - 3] = st[sp - 2];
        st[sp - 2] = st[sp - 1];
        st[sp - 1] = a;
        break;
      case 0x10:
        st[sp - 2] = (st[sp - 2] + st[sp - 1]) | 0;
        sp--;
        break;
      case 0x11:
        st[sp - 2] = (st[sp - 2] - st[sp - 1]) | 0;
        sp--;
        break;
      case 0x12:
        st[sp - 2] = Math.imul(st[sp - 2], st[sp - 1]);
        sp--;
        break;
      case 0x13:
        b = st[sp - 1];
        if (b === 0) return stop(4);
        st[sp - 2] = (st[sp - 2] / b) | 0;
        sp--;
        break;
      case 0x14:
        b = st[sp - 1];
        if (b === 0) return stop(4);
        st[sp - 2] = (st[sp - 2] % b) | 0;
        sp--;
        break;
      case 0x15:
        b = st[sp - 1] >>> 0;
        if (b === 0) return stop(4);
        st[sp - 2] = (Math.floor((st[sp - 2] >>> 0) / b) | 0);
        sp--;
        break;
      case 0x16:
        b = st[sp - 1] >>> 0;
        if (b === 0) return stop(4);
        st[sp - 2] = ((st[sp - 2] >>> 0) % b) | 0;
        sp--;
        break;
      case 0x17:
        st[sp - 1] = -st[sp - 1] | 0;
        break;
      case 0x18:
        st[sp - 2] = st[sp - 2] & st[sp - 1];
        sp--;
        break;
      case 0x19:
        st[sp - 2] = st[sp - 2] | st[sp - 1];
        sp--;
        break;
      case 0x1a:
        st[sp - 2] = st[sp - 2] ^ st[sp - 1];
        sp--;
        break;
      case 0x1b:
        st[sp - 1] = ~st[sp - 1];
        break;
      case 0x1c:
        st[sp - 2] = st[sp - 2] << (st[sp - 1] & 31);
        sp--;
        break;
      case 0x1d:
        st[sp - 2] = st[sp - 2] >> (st[sp - 1] & 31);
        sp--;
        break;
      case 0x1e:
        st[sp - 2] = (st[sp - 2] >>> (st[sp - 1] & 31)) | 0;
        sp--;
        break;
      case 0x20:
        st[sp - 2] = st[sp - 2] === st[sp - 1] ? 1 : 0;
        sp--;
        break;
      case 0x21:
        st[sp - 2] = st[sp - 2] < st[sp - 1] ? 1 : 0;
        sp--;
        break;
      case 0x22:
        st[sp - 2] = (st[sp - 2] >>> 0) < (st[sp - 1] >>> 0) ? 1 : 0;
        sp--;
        break;
      case 0x30:
        rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        pc = next + rel;
        break;
      case 0x31:
        rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        if (st[--sp] === 0) pc = next + rel;
        break;
      case 0x32:
        rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        if (st[--sp] !== 0) pc = next + rel;
        break;
      case 0x33:
        if (csp === CALL_MAX) return stop(7);
        calls[csp++] = next;
        pc = prog[next - 2] | (prog[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return stop(8);
        pc = calls[--csp];
        break;
      case 0x40:
        a = st[sp - 1];
        if (a < 0 || a >= MEM_WORDS) return stop(6);
        st[sp - 1] = mem[a];
        break;
      case 0x41:
        a = st[sp - 1];
        if (a < 0 || a >= MEM_WORDS) return stop(6);
        mem[a] = st[sp - 2];
        sp -= 2;
        break;
      case 0x50: {
        const s = String(st[sp - 1]);
        if (olen + s.length > OUT_MAX) return stop(11);
        olen += out.write(s, olen, 'ascii');
        sp--;
        break;
      }
      case 0x51:
        if (olen + 1 > OUT_MAX) return stop(11);
        out[olen++] = st[--sp] & 255;
        break;
      case 0x52:
        st[sp++] = ip < input.length ? input[ip++] : -1;
        break;
      case 0x53:
        return stop(st[--sp] & 255);
    }
  }
}

const inDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(inDir).sort()) {
  const answer = run(readFileSync(join(inDir, id, 'program.bin')), readFileSync(join(inDir, id, 'input.bin')));
  const dir = join(outDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'stdout.bin'), answer.stdout);
  writeFileSync(join(dir, 'exit.txt'), String(answer.exit) + '\n');
}
