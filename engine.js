/* My Goals — mini low-poly WebGL motoru (harici kütüphane gerektirmez) */
(function (g) {
  'use strict';
  const V = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  };
  const M = {
    mul(a, b) {
      const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return o;
    },
    persp(fov, asp, n, f) {
      const t = 1 / Math.tan(fov / 2);
      return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0];
    },
    look(eye, tg, up) {
      const z = V.norm(V.sub(eye, tg)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
      return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V.dot(x, eye), -V.dot(y, eye), -V.dot(z, eye), 1];
    },
    trs(p, r, s) {
      const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
      const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
      const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
      const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
      return [r00 * s[0], r10 * s[0], r20 * s[0], 0, r01 * s[1], r11 * s[1], r21 * s[1], 0, r02 * s[2], r12 * s[2], r22 * s[2], 0, p[0], p[1], p[2], 1];
    },
    tp: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]],
    td: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]]
  };
  const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const shade = (c, f) => [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];

  class Geo {
    constructor() { this.d = []; }
    // ref: şeklin içindeki bir nokta; normal ondan dışarı bakacak şekilde çevrilir
    tri(a, b, c, col, ref) {
      let n = V.cross(V.sub(b, a), V.sub(c, a)); const l = V.len(n);
      if (l < 1e-9) return this;
      n = V.mul(n, 1 / l);
      if (ref) {
        const ce = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
        if (V.dot(n, V.sub(ce, ref)) < 0) n = V.mul(n, -1);
      }
      const d = this.d;
      d.push(a[0], a[1], a[2], n[0], n[1], n[2], col[0], col[1], col[2],
        b[0], b[1], b[2], n[0], n[1], n[2], col[0], col[1], col[2],
        c[0], c[1], c[2], n[0], n[1], n[2], col[0], col[1], col[2]);
      return this;
    }
    quad(a, b, c, d, col, ref) { this.tri(a, b, c, col, ref); return this.tri(a, c, d, col, ref); }
    add(o, m) {
      const s = o.d, d = this.d;
      for (let i = 0; i < s.length; i += 9) {
        if (m) {
          const p = M.tp(m, [s[i], s[i + 1], s[i + 2]]), n = V.norm(M.td(m, [s[i + 3], s[i + 4], s[i + 5]]));
          d.push(p[0], p[1], p[2], n[0], n[1], n[2], s[i + 6], s[i + 7], s[i + 8]);
        } else for (let k = 0; k < 9; k++) d.push(s[i + k]);
      }
      return this;
    }
    // konum, y-dönüşü, ölçek (sayı ya da [x,y,z]), x ve z dönüşü
    put(o, x, y, z, ry, s, rx, rz) {
      if (s === undefined) s = 1;
      const sc = typeof s === 'number' ? [s, s, s] : s;
      return this.add(o, M.trs([x, y, z], [rx || 0, ry || 0, rz || 0], sc));
    }
  }

  const P = {
    // taban y=0, x/z ortalı kutu
    box(w, h, d, col, top) {
      const g = new Geo(), x = w / 2, z = d / 2, r = [0, h / 2, 0];
      const a = [-x, 0, -z], b = [x, 0, -z], c = [x, 0, z], e = [-x, 0, z], A = [-x, h, -z], B = [x, h, -z], C = [x, h, z], E = [-x, h, z];
      g.quad(A, B, C, E, top || col, r); g.quad(a, b, c, e, col, r);
      g.quad(a, b, B, A, col, r); g.quad(b, c, C, B, col, r); g.quad(c, e, E, C, col, r); g.quad(e, a, A, E, col, r);
      return g;
    },
    cone(r, h, seg, col, rot) {
      const g = new Geo(), ref = [0, h * 0.3, 0]; rot = rot || 0;
      for (let i = 0; i < seg; i++) {
        const a = rot + i / seg * 6.2832, b = rot + (i + 1) / seg * 6.2832;
        g.tri([Math.cos(a) * r, 0, Math.sin(a) * r], [Math.cos(b) * r, 0, Math.sin(b) * r], [0, h, 0], col, ref);
      }
      return g;
    },
    cyl(rb, rt, h, seg, col, cap) {
      const g = new Geo(), ref = [0, h / 2, 0];
      for (let i = 0; i < seg; i++) {
        const a = i / seg * 6.2832, b = (i + 1) / seg * 6.2832, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        g.quad([ca * rb, 0, sa * rb], [cb * rb, 0, sb * rb], [cb * rt, h, sb * rt], [ca * rt, h, sa * rt], col, ref);
        g.tri([ca * rt, h, sa * rt], [cb * rt, h, sb * rt], [0, h, 0], cap || col, ref);
      }
      return g;
    },
    icoData(detail) {
      const t = (1 + Math.sqrt(5)) / 2;
      let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm);
      let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
      for (let d = 0; d < detail; d++) {
        const cache = {}, nf = [];
        const mid = (a, b) => {
          const k = a < b ? a + '_' + b : b + '_' + a;
          if (cache[k] === undefined) { cache[k] = v.length; v.push(V.norm(V.add(v[a], v[b]))); }
          return cache[k];
        };
        for (const [a, b, c] of f) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
        f = nf;
      }
      return { v, f };
    },
    // col: renk ya da fn(merkez)->renk ; disp: fn(birimVektör)->yarıçap çarpanı
    sphere(r, detail, col, disp) {
      const g = new Geo(), { v, f } = P.icoData(detail);
      const pv = v.map(p => V.mul(p, r * (disp ? disp(p) : 1)));
      for (const [a, b, c] of f) {
        const ce = V.norm(V.add(V.add(v[a], v[b]), v[c]));
        g.tri(pv[a], pv[b], pv[c], typeof col === 'function' ? col(ce) : col, [0, 0, 0]);
      }
      return g;
    }
  };

  const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;
uniform mat4 uVP;uniform mat4 uM;uniform vec3 uL;uniform vec3 uLC;uniform vec3 uAmb;uniform vec3 uTint;uniform vec3 uFx;uniform vec2 uFog;
varying vec3 vC;varying float vF;
void main(){vec4 wp=uM*vec4(aP,1.0);vec3 n=normalize((uM*vec4(aN,0.0)).xyz);
float d=max(dot(n,uL),0.0);vec3 base=aC*uTint;float gr=dot(base,vec3(0.3,0.59,0.11));
base=mix(base,vec3(gr*0.75+0.12),uFx.x);
vec3 lit=base*(uAmb*(0.78+0.22*n.y)+uLC*d);vC=mix(lit,base,uFx.y);
gl_Position=uVP*wp;vF=(1.0-uFx.z)*clamp((gl_Position.w-uFog.x)/(uFog.y-uFog.x),0.0,1.0);}`;
  const FS = `precision mediump float;varying vec3 vC;varying float vF;uniform vec3 uFogC;
void main(){gl_FragColor=vec4(mix(vC,uFogC,vF),1.0);}`;

  class Engine {
    constructor(cv) {
      this.cv = cv;
      const gl = this.gl = cv.getContext('webgl', { antialias: true, alpha: false }) || cv.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL yok');
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const p = this.prog = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(p, 0, 'aP'); gl.bindAttribLocation(p, 1, 'aN'); gl.bindAttribLocation(p, 2, 'aC');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      gl.useProgram(p);
      this.u = {};
      ['uVP', 'uM', 'uL', 'uLC', 'uAmb', 'uTint', 'uFx', 'uFog', 'uFogC'].forEach(n => this.u[n] = gl.getUniformLocation(p, n));
      gl.enable(gl.DEPTH_TEST);
      gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
      this.w = 1; this.h = 1;
    }
    mesh(geo) {
      const gl = this.gl, b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.d), gl.STATIC_DRAW);
      return { b, n: geo.d.length / 9 };
    }
    free(m) { if (m && m.b) { this.gl.deleteBuffer(m.b); m.b = null; } }
    node(geo, o) {
      return Object.assign({ mesh: geo ? this.mesh(geo) : null, pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], visible: true, tint: [1, 1, 1], gray: 0, emis: 0, add: false, nofog: false }, o || {});
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), w = this.cv.clientWidth, h = this.cv.clientHeight;
      this.w = w; this.h = h;
      const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
      if (this.cv.width !== pw || this.cv.height !== ph) { this.cv.width = pw; this.cv.height = ph; }
    }
    setCam(c) {
      this.cam = c; this.asp = this.w / this.h;
      this.vp = M.mul(M.persp(c.fov, this.asp, c.near, c.far), M.look(c.eye, c.target, c.up));
      this.fw = V.norm(V.sub(c.target, c.eye)); this.rt = V.norm(V.cross(this.fw, c.up)); this.upv = V.cross(this.rt, this.fw);
    }
    project(p) {
      const m = this.vp, w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      if (w <= 0) return null;
      const x = (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w, y = (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w;
      return [(x * 0.5 + 0.5) * this.w, (0.5 - y * 0.5) * this.h];
    }
    ray(x, y) {
      const t = Math.tan(this.cam.fov / 2), nx = (2 * x / this.w - 1) * t * this.asp, ny = (1 - 2 * y / this.h) * t;
      return V.norm(V.add(this.fw, V.add(V.mul(this.rt, nx), V.mul(this.upv, ny))));
    }
    render(nodes, sc) {
      const gl = this.gl, u = this.u;
      gl.viewport(0, 0, this.cv.width, this.cv.height);
      gl.clearColor(sc.sky[0], sc.sky[1], sc.sky[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(u.uVP, false, new Float32Array(this.vp));
      gl.uniform3fv(u.uL, sc.L); gl.uniform3fv(u.uLC, sc.LC); gl.uniform3fv(u.uAmb, sc.amb);
      gl.uniform3fv(u.uFogC, sc.fogC); gl.uniform2fv(u.uFog, sc.fog);
      const late = [];
      const draw = n => {
        gl.uniformMatrix4fv(u.uM, false, new Float32Array(M.trs(n.pos, n.rot, n.scale)));
        gl.uniform3fv(u.uTint, n.tint); gl.uniform3f(u.uFx, n.gray, n.emis, n.nofog ? 1 : 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, n.mesh.b);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
        gl.drawArrays(gl.TRIANGLES, 0, n.mesh.n);
      };
      for (const n of nodes) { if (!n.visible || !n.mesh || !n.mesh.b || !n.mesh.n) continue; if (n.add) late.push(n); else draw(n); }
      if (late.length) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        late.forEach(draw);
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
    }
  }
  g.E3 = { V, M, Geo, P, Engine, hex, shade };
})(window);
