var clipboard,
  plugins,
  wasm_memory,
  high_dpi,
  FS,
  GL,
  register_plugin,
  wasm_exports,
  emscripten_shaders_hack,
  importObject,
  js_objects,
  unique_js_id,
  quad_socket,
  connected,
  received_buffer,
  uid,
  ongoing_requests;
("use strict");
const version = "0.1.26",
  canvas = document.querySelector("#glcanvas-fourier"),
  gl = canvas.getContext("webgl");
gl === null &&
  alert(
    "Unable to initialize WebGL. Your browser or machine may not support it."
  ),
  (clipboard = null),
  (plugins = []);
(high_dpi = !1),
  canvas.focus(),
  (canvas.requestPointerLock =
    canvas.requestPointerLock ||
    canvas.mozRequestPointerLock ||
    function () {}),
  (document.exitPointerLock =
    document.exitPointerLock || document.mozExitPointerLock || function () {});
function assert(a, b) {
  a == !1 && alert(b);
}
function acquireVertexArrayObjectExtension(a) {
  var b = a.getExtension("OES_vertex_array_object");
  b
    ? ((a.createVertexArray = function () {
        return b.createVertexArrayOES();
      }),
      (a.deleteVertexArray = function (a) {
        b.deleteVertexArrayOES(a);
      }),
      (a.bindVertexArray = function (a) {
        b.bindVertexArrayOES(a);
      }),
      (a.isVertexArray = function (a) {
        return b.isVertexArrayOES(a);
      }))
    : alert("Unable to get OES_vertex_array_object extension");
}
function acquireInstancedArraysExtension(a) {
  var b = a.getExtension("ANGLE_instanced_arrays");
  b &&
    ((a.vertexAttribDivisor = function (a, c) {
      b.vertexAttribDivisorANGLE(a, c);
    }),
    (a.drawArraysInstanced = function (a, c, d, e) {
      b.drawArraysInstancedANGLE(a, c, d, e);
    }),
    (a.drawElementsInstanced = function (a, c, d, e, f) {
      b.drawElementsInstancedANGLE(a, c, d, e, f);
    }));
}
function acquireDisjointTimerQueryExtension(a) {
  var b = a.getExtension("EXT_disjoint_timer_query");
  b &&
    ((a.createQuery = function () {
      return b.createQueryEXT();
    }),
    (a.beginQuery = function (a, c) {
      return b.beginQueryEXT(a, c);
    }),
    (a.endQuery = function (a) {
      return b.endQueryEXT(a);
    }),
    (a.deleteQuery = function (a) {
      b.deleteQueryEXT(a);
    }),
    (a.getQueryObject = function (a, c) {
      return b.getQueryObjectEXT(a, c);
    }));
}
acquireVertexArrayObjectExtension(gl),
  acquireInstancedArraysExtension(gl),
  acquireDisjointTimerQueryExtension(gl),
  gl.getExtension("WEBGL_depth_texture") == null &&
    alert("Cant initialize WEBGL_depth_texture extension");
function getArray(a, b, c) {
  return new b(wasm_memory.buffer, a, c);
}
function UTF8ToString(i, j) {
  var b, h, c, a, d, f, g;
  let e = new Uint8Array(wasm_memory.buffer, i);
  for (b = 0, h = b + j, c = ""; !(b >= h); ) {
    if (((a = e[b++]), !a)) return c;
    if (!(a & 128)) {
      c += String.fromCharCode(a);
      continue;
    }
    if (((d = e[b++] & 63), (a & 224) == 192)) {
      c += String.fromCharCode(((a & 31) << 6) | d);
      continue;
    }
    (f = e[b++] & 63),
      (a & 240) == 224
        ? (a = ((a & 15) << 12) | (d << 6) | f)
        : ((a & 248) != 240 &&
            console.warn(
              "Invalid UTF-8 leading byte 0x" +
                a.toString(16) +
                " encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!"
            ),
          (a = ((a & 7) << 18) | (d << 12) | (f << 6) | (e[b++] & 63))),
      a < 65536
        ? (c += String.fromCharCode(a))
        : ((g = a - 65536),
          (c += String.fromCharCode(55296 | (g >> 10), 56320 | (g & 1023))));
  }
  return c;
}
function stringToUTF8(f, c, b, g) {
  for (var h = b, e = b + g, d = 0, a, i; d < f.length; ++d)
    if (
      ((a = f.charCodeAt(d)),
      a >= 55296 &&
        a <= 57343 &&
        ((i = f.charCodeAt(++d)),
        (a = (65536 + ((a & 1023) << 10)) | (i & 1023))),
      a <= 127)
    ) {
      if (b >= e) break;
      c[b++] = a;
    } else if (a <= 2047) {
      if (b + 1 >= e) break;
      (c[b++] = 192 | (a >> 6)), (c[b++] = 128 | (a & 63));
    } else if (a <= 65535) {
      if (b + 2 >= e) break;
      (c[b++] = 224 | (a >> 12)),
        (c[b++] = 128 | ((a >> 6) & 63)),
        (c[b++] = 128 | (a & 63));
    } else {
      if (b + 3 >= e) break;
      a >= 2097152 &&
        console.warn(
          "Invalid Unicode code point 0x" +
            a.toString(16) +
            " encountered when serializing a JS string to an UTF-8 string on the asm.js/wasm heap! (Valid unicode code points should be in range 0-0x1FFFFF)."
        ),
        (c[b++] = 240 | (a >> 18)),
        (c[b++] = 128 | ((a >> 12) & 63)),
        (c[b++] = 128 | ((a >> 6) & 63)),
        (c[b++] = 128 | (a & 63));
    }
  return b - h;
}
(FS = { loaded_files: [], unique_id: 0 }),
  (GL = {
    counter: 1,
    buffers: [],
    mappedBuffers: {},
    programs: [],
    framebuffers: [],
    renderbuffers: [],
    textures: [],
    uniforms: [],
    shaders: [],
    vaos: [],
    timerQueries: [],
    contexts: {},
    programInfos: {},
    getNewId: function (b) {
      for (var c = GL.counter++, a = b.length; a < c; a++) b[a] = null;
      return c;
    },
    validateGLObjectID: function (b, a, c, d) {
      a != 0 &&
        (b[a] === null
          ? console.error(
              c + " called with an already deleted " + d + " ID " + a + "!"
            )
          : b[a] ||
            console.error(
              c + " called with an invalid " + d + " ID " + a + "!"
            ));
    },
    getSource: function (g, e, f, b) {
      for (var c = "", a = 0, d; a < e; ++a)
        (d = b == 0 ? void 0 : getArray(b + a * 4, Uint32Array, 1)[0]),
          (c += UTF8ToString(getArray(f + a * 4, Uint32Array, 1)[0], d));
      return c;
    },
    populateUniformTable: function (i) {
      var d, h, j, k, g, e, a, b, c, f, l;
      GL.validateGLObjectID(GL.programs, i, "populateUniformTable", "program"),
        (d = GL.programs[i]),
        (h = GL.programInfos[i] =
          {
            uniforms: {},
            maxUniformLength: 0,
            maxAttributeLength: -1,
            maxUniformBlockNameLength: -1,
          }),
        (j = h.uniforms),
        (k = gl.getProgramParameter(d, 35718));
      for (g = 0; g < k; ++g)
        if (
          ((e = gl.getActiveUniform(d, g)),
          (a = e.name),
          (h.maxUniformLength = Math.max(h.maxUniformLength, a.length + 1)),
          a.slice(-1) == "]" && (a = a.slice(0, a.lastIndexOf("["))),
          (b = gl.getUniformLocation(d, a)),
          b)
        ) {
          (c = GL.getNewId(GL.uniforms)),
            (j[a] = [e.size, c]),
            (GL.uniforms[c] = b);
          for (f = 1; f < e.size; ++f)
            (l = a + "[" + f + "]"),
              (b = gl.getUniformLocation(d, l)),
              (c = GL.getNewId(GL.uniforms)),
              (GL.uniforms[c] = b);
        }
    },
  });
function _glGenObject(g, h, d, e, f) {
  for (var c = 0, a, b; c < g; c++)
    (a = gl[d]()),
      (b = a && GL.getNewId(e)),
      a
        ? ((a.name = b), (e[b] = a))
        : (console.error("GL_INVALID_OPERATION"),
          GL.recordError(1282),
          alert(
            "GL_INVALID_OPERATION in " +
              f +
              ": GLctx." +
              d +
              " returned null - most likely GL context is lost!"
          )),
      (getArray(h + c * 4, Int32Array, 1)[0] = b);
}
function _webglGet(d, e, c) {
  var a, f, b, g;
  if (!e) {
    console.error(
      "GL_INVALID_VALUE in glGet" +
        c +
        "v(name=" +
        d +
        ": Function called with null out pointer!"
    ),
      GL.recordError(1281);
    return;
  }
  switch (((a = void 0), d)) {
    case 36346:
      a = 1;
      break;
    case 36344:
      c != "EM_FUNC_SIG_PARAM_I" &&
        c != "EM_FUNC_SIG_PARAM_I64" &&
        (GL.recordError(1280),
        err(
          "GL_INVALID_ENUM in glGet" +
            c +
            "v(GL_SHADER_BINARY_FORMATS): Invalid parameter type!"
        ));
      return;
    case 34814:
    case 36345:
      a = 0;
      break;
    case 34466:
      (f = gl.getParameter(34467)), (a = f ? f.length : 0);
      break;
    case 33309:
      assert(!1, "unimplemented");
      break;
    case 33307:
    case 33308:
      assert(!1, "unimplemented");
      break;
  }
  if (a === void 0)
    switch (((b = gl.getParameter(d)), typeof b)) {
      case "number":
        a = b;
        break;
      case "boolean":
        a = b ? 1 : 0;
        break;
      case "string":
        GL.recordError(1280),
          console.error(
            "GL_INVALID_ENUM in glGet" +
              c +
              "v(" +
              d +
              ") on a name which returns a string!"
          );
        return;
      case "object":
        if (b === null)
          switch (d) {
            case 34964:
            case 35725:
            case 34965:
            case 36006:
            case 36007:
            case 32873:
            case 34229:
            case 35097:
            case 36389:
            case 34068: {
              a = 0;
              break;
            }
            default: {
              GL.recordError(1280),
                console.error(
                  "GL_INVALID_ENUM in glGet" +
                    c +
                    "v(" +
                    d +
                    ") and it returns null!"
                );
              return;
            }
          }
        else if (
          b instanceof Float32Array ||
          b instanceof Uint32Array ||
          b instanceof Int32Array ||
          b instanceof Array
        ) {
          for (g = 0; g < b.length; ++g) assert(!1, "unimplemented");
          return;
        } else
          try {
            a = b.name | 0;
          } catch (a) {
            GL.recordError(1280),
              console.error(
                "GL_INVALID_ENUM in glGet" +
                  c +
                  "v: Unknown object returned from WebGL getParameter(" +
                  d +
                  ")! (error: " +
                  a +
                  ")"
              );
            return;
          }
        break;
      default:
        GL.recordError(1280),
          console.error(
            "GL_INVALID_ENUM in glGet" +
              c +
              "v: Native code calling glGet" +
              c +
              "v(" +
              d +
              ") and it returns " +
              b +
              " of type " +
              typeof b +
              "!"
          );
        return;
    }
  switch (c) {
    case "EM_FUNC_SIG_PARAM_I64":
      getArray(e, Int32Array, 1)[0] = a;
    case "EM_FUNC_SIG_PARAM_I":
      getArray(e, Int32Array, 1)[0] = a;
      break;
    case "EM_FUNC_SIG_PARAM_F":
      getArray(e, Float32Array, 1)[0] = a;
      break;
    case "EM_FUNC_SIG_PARAM_B":
      getArray(e, Int8Array, 1)[0] = a ? 1 : 0;
      break;
    default:
      throw "internal glGet error, bad type: " + c;
  }
}
function resize(a, d) {
  var e = dpi_scale(),
    b = a.clientWidth * e,
    c = a.clientHeight * e;
  (a.width != b || a.height != c) &&
    ((a.width = b),
    (a.height = c),
    d != void 0 && d(Math.floor(b), Math.floor(c)));
}
function animation() {
  wasm_exports.frame(), window.requestAnimationFrame(animation);
}
const SAPP_EVENTTYPE_TOUCHES_BEGAN = 10,
  SAPP_EVENTTYPE_TOUCHES_MOVED = 11,
  SAPP_EVENTTYPE_TOUCHES_ENDED = 12,
  SAPP_EVENTTYPE_TOUCHES_CANCELLED = 13,
  SAPP_MODIFIER_SHIFT = 1,
  SAPP_MODIFIER_CTRL = 2,
  SAPP_MODIFIER_ALT = 4,
  SAPP_MODIFIER_SUPER = 8;
function into_sapp_mousebutton(a) {
  switch (a) {
    case 0:
      return 0;
    case 1:
      return 2;
    case 2:
      return 1;
    default:
      return a;
  }
}
function into_sapp_keycode(a) {
  switch (a) {
    case "Space":
      return 32;
    case "Quote":
      return 39;
    case "Comma":
      return 44;
    case "Minus":
      return 45;
    case "Period":
      return 46;
    case "Slash":
      return 47;
    case "Digit0":
      return 48;
    case "Digit1":
      return 49;
    case "Digit2":
      return 50;
    case "Digit3":
      return 51;
    case "Digit4":
      return 52;
    case "Digit5":
      return 53;
    case "Digit6":
      return 54;
    case "Digit7":
      return 55;
    case "Digit8":
      return 56;
    case "Digit9":
      return 57;
    case "Semicolon":
      return 59;
    case "Equal":
      return 61;
    case "KeyA":
      return 65;
    case "KeyB":
      return 66;
    case "KeyC":
      return 67;
    case "KeyD":
      return 68;
    case "KeyE":
      return 69;
    case "KeyF":
      return 70;
    case "KeyG":
      return 71;
    case "KeyH":
      return 72;
    case "KeyI":
      return 73;
    case "KeyJ":
      return 74;
    case "KeyK":
      return 75;
    case "KeyL":
      return 76;
    case "KeyM":
      return 77;
    case "KeyN":
      return 78;
    case "KeyO":
      return 79;
    case "KeyP":
      return 80;
    case "KeyQ":
      return 81;
    case "KeyR":
      return 82;
    case "KeyS":
      return 83;
    case "KeyT":
      return 84;
    case "KeyU":
      return 85;
    case "KeyV":
      return 86;
    case "KeyW":
      return 87;
    case "KeyX":
      return 88;
    case "KeyY":
      return 89;
    case "KeyZ":
      return 90;
    case "BracketLeft":
      return 91;
    case "Backslash":
      return 92;
    case "BracketRight":
      return 93;
    case "Backquote":
      return 96;
    case "Escape":
      return 256;
    case "Enter":
      return 257;
    case "Tab":
      return 258;
    case "Backspace":
      return 259;
    case "Insert":
      return 260;
    case "Delete":
      return 261;
    case "ArrowRight":
      return 262;
    case "ArrowLeft":
      return 263;
    case "ArrowDown":
      return 264;
    case "ArrowUp":
      return 265;
    case "PageUp":
      return 266;
    case "PageDown":
      return 267;
    case "Home":
      return 268;
    case "End":
      return 269;
    case "CapsLock":
      return 280;
    case "ScrollLock":
      return 281;
    case "NumLock":
      return 282;
    case "PrintScreen":
      return 283;
    case "Pause":
      return 284;
    case "F1":
      return 290;
    case "F2":
      return 291;
    case "F3":
      return 292;
    case "F4":
      return 293;
    case "F5":
      return 294;
    case "F6":
      return 295;
    case "F7":
      return 296;
    case "F8":
      return 297;
    case "F9":
      return 298;
    case "F10":
      return 299;
    case "F11":
      return 300;
    case "F12":
      return 301;
    case "F13":
      return 302;
    case "F14":
      return 303;
    case "F15":
      return 304;
    case "F16":
      return 305;
    case "F17":
      return 306;
    case "F18":
      return 307;
    case "F19":
      return 308;
    case "F20":
      return 309;
    case "F21":
      return 310;
    case "F22":
      return 311;
    case "F23":
      return 312;
    case "F24":
      return 313;
    case "Numpad0":
      return 320;
    case "Numpad1":
      return 321;
    case "Numpad2":
      return 322;
    case "Numpad3":
      return 323;
    case "Numpad4":
      return 324;
    case "Numpad5":
      return 325;
    case "Numpad6":
      return 326;
    case "Numpad7":
      return 327;
    case "Numpad8":
      return 328;
    case "Numpad9":
      return 329;
    case "NumpadDecimal":
      return 330;
    case "NumpadDivide":
      return 331;
    case "NumpadMultiply":
      return 332;
    case "NumpadSubstract":
      return 333;
    case "NumpadAdd":
      return 334;
    case "NumpadEnter":
      return 335;
    case "NumpadEqual":
      return 336;
    case "ShiftLeft":
      return 340;
    case "ControlLeft":
      return 341;
    case "AltLeft":
      return 342;
    case "OSLeft":
      return 343;
    case "ShiftRight":
      return 344;
    case "ControlRight":
      return 345;
    case "AltRight":
      return 346;
    case "OSRight":
      return 347;
    case "ContextMenu":
      return 348;
  }
  console.log("Unsupported keyboard key: ", a);
}
function dpi_scale() {
  return high_dpi ? window.devicePixelRatio || 1 : 1;
}
function texture_size(c, a, b) {
  return c == gl.ALPHA
    ? a * b
    : c == gl.RGB
    ? a * b * 3
    : c == gl.RGBA
    ? a * b * 4
    : a * b * 3;
}
function mouse_relative_position(b, c) {
  var a = canvas.getBoundingClientRect(),
    d = (b - a.left) * dpi_scale(),
    e = (c - a.top) * dpi_scale();
  return { x: d, y: e };
}
(emscripten_shaders_hack = !1),
  (importObject = {
    env: {
      console_debug: function (a) {
        console.debug(UTF8ToString(a));
      },
      console_log: function (a) {
        console.log(UTF8ToString(a));
      },
      console_info: function (a) {
        console.info(UTF8ToString(a));
      },
      console_warn: function (a) {
        console.warn(UTF8ToString(a));
      },
      console_error: function (a) {
        console.error(UTF8ToString(a));
      },
      set_emscripten_shader_hack: function (a) {
        emscripten_shaders_hack = a;
      },
      sapp_set_clipboard: function (a, b) {
        clipboard = UTF8ToString(a, b);
      },
      dpi_scale,
      rand: function () {
        return Math.floor(Math.random() * 2147483647);
      },
      now: function () {
        return Date.now() / 1e3;
      },
      canvas_width: function () {
        return Math.floor(canvas.width);
      },
      canvas_height: function () {
        return Math.floor(canvas.height);
      },
      glClearDepthf: function (a) {
        gl.clearDepth(a);
      },
      glClearColor: function (a, b, c, d) {
        gl.clearColor(a, b, c, d);
      },
      glClearStencil: function (a) {
        gl.clearColorStencil(a);
      },
      glColorMask: function (a, b, c, d) {
        gl.colorMask(a, b, c, d);
      },
      glScissor: function (a, b, c, d) {
        gl.scissor(a, b, c, d);
      },
      glClear: function (a) {
        gl.clear(a);
      },
      glGenTextures: function (a, b) {
        _glGenObject(a, b, "createTexture", GL.textures, "glGenTextures");
      },
      glActiveTexture: function (a) {
        gl.activeTexture(a);
      },
      glBindTexture: function (b, a) {
        GL.validateGLObjectID(GL.textures, a, "glBindTexture", "texture"),
          gl.bindTexture(b, GL.textures[a]);
      },
      glTexImage2D: function (e, f, a, b, c, g, h, i, d) {
        gl.texImage2D(
          e,
          f,
          a,
          b,
          c,
          g,
          h,
          i,
          d ? getArray(d, Uint8Array, texture_size(a, b, c)) : null
        );
      },
      glTexSubImage2D: function (g, e, i, f, c, d, a, h, b) {
        gl.texSubImage2D(
          g,
          e,
          i,
          f,
          c,
          d,
          a,
          h,
          b ? getArray(b, Uint8Array, texture_size(a, c, d)) : null
        );
      },
      glReadPixels: function (d, e, a, b, c, f, g) {
        var h = getArray(g, Uint8Array, texture_size(c, a, b));
        gl.readPixels(d, e, a, b, c, f, h);
      },
      glTexParameteri: function (a, b, c) {
        gl.texParameteri(a, b, c);
      },
      glUniform1fv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform1fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to float data passed to glUniform1fv must be aligned to four bytes!"
          );
        var d = getArray(b, Float32Array, 1 * c);
        gl.uniform1fv(GL.uniforms[a], d);
      },
      glUniform2fv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform2fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to float data passed to glUniform2fv must be aligned to four bytes!"
          );
        var d = getArray(b, Float32Array, 2 * c);
        gl.uniform2fv(GL.uniforms[a], d);
      },
      glUniform3fv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform3fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to float data passed to glUniform3fv must be aligned to four bytes!"
          );
        var d = getArray(b, Float32Array, 3 * c);
        gl.uniform3fv(GL.uniforms[a], d);
      },
      glUniform4fv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform4fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to float data passed to glUniform4fv must be aligned to four bytes!"
          );
        var d = getArray(b, Float32Array, 4 * c);
        gl.uniform4fv(GL.uniforms[a], d);
      },
      glUniform1iv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform1fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to i32 data passed to glUniform1iv must be aligned to four bytes!"
          );
        var d = getArray(b, Int32Array, 1 * c);
        gl.uniform1iv(GL.uniforms[a], d);
      },
      glUniform2iv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform2fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to i32 data passed to glUniform2iv must be aligned to four bytes!"
          );
        var d = getArray(b, Int32Array, 2 * c);
        gl.uniform2iv(GL.uniforms[a], d);
      },
      glUniform3iv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform3fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to i32 data passed to glUniform3iv must be aligned to four bytes!"
          );
        var d = getArray(b, Int32Array, 3 * c);
        gl.uniform3iv(GL.uniforms[a], d);
      },
      glUniform4iv: function (a, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform4fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to i32 data passed to glUniform4iv must be aligned to four bytes!"
          );
        var d = getArray(b, Int32Array, 4 * c);
        gl.uniform4iv(GL.uniforms[a], d);
      },
      glBlendFunc: function (a, b) {
        gl.blendFunc(a, b);
      },
      glBlendEquationSeparate: function (a, b) {
        gl.blendEquationSeparate(a, b);
      },
      glDisable: function (a) {
        gl.disable(a);
      },
      glDrawElements: function (a, b, c, d) {
        gl.drawElements(a, b, c, d);
      },
      glGetIntegerv: function (a, b) {
        _webglGet(a, b, "EM_FUNC_SIG_PARAM_I");
      },
      glUniform1f: function (a, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform1f", "location"),
          gl.uniform1f(GL.uniforms[a], b);
      },
      glUniform1i: function (a, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniform1i", "location"),
          gl.uniform1i(GL.uniforms[a], b);
      },
      glGetAttribLocation: function (a, b) {
        return gl.getAttribLocation(GL.programs[a], UTF8ToString(b));
      },
      glEnableVertexAttribArray: function (a) {
        gl.enableVertexAttribArray(a);
      },
      glDisableVertexAttribArray: function (a) {
        gl.disableVertexAttribArray(a);
      },
      glVertexAttribPointer: function (a, b, c, d, e, f) {
        gl.vertexAttribPointer(a, b, c, !!d, e, f);
      },
      glGetUniformLocation: function (e, a) {
        var b, c, d;
        return (
          GL.validateGLObjectID(
            GL.programs,
            e,
            "glGetUniformLocation",
            "program"
          ),
          (a = UTF8ToString(a)),
          (b = 0),
          a[a.length - 1] == "]" &&
            ((c = a.lastIndexOf("[")),
            (b = a[c + 1] != "]" ? parseInt(a.slice(c + 1)) : 0),
            (a = a.slice(0, c))),
          (d = GL.programInfos[e] && GL.programInfos[e].uniforms[a]),
          d && b >= 0 && b < d[0] ? d[1] + b : -1
        );
      },
      glUniformMatrix4fv: function (a, e, c, b) {
        GL.validateGLObjectID(GL.uniforms, a, "glUniformMatrix4fv", "location"),
          assert(
            (b & 3) == 0,
            "Pointer to float data passed to glUniformMatrix4fv must be aligned to four bytes!"
          );
        var d = getArray(b, Float32Array, 16);
        gl.uniformMatrix4fv(GL.uniforms[a], !!c, d);
      },
      glUseProgram: function (a) {
        GL.validateGLObjectID(GL.programs, a, "glUseProgram", "program"),
          gl.useProgram(GL.programs[a]);
      },
      glGenVertexArrays: function (a, b) {
        _glGenObject(a, b, "createVertexArray", GL.vaos, "glGenVertexArrays");
      },
      glGenFramebuffers: function (a, b) {
        _glGenObject(
          a,
          b,
          "createFramebuffer",
          GL.framebuffers,
          "glGenFramebuffers"
        );
      },
      glBindVertexArray: function (a) {
        gl.bindVertexArray(GL.vaos[a]);
      },
      glBindFramebuffer: function (b, a) {
        GL.validateGLObjectID(
          GL.framebuffers,
          a,
          "glBindFramebuffer",
          "framebuffer"
        ),
          gl.bindFramebuffer(b, GL.framebuffers[a]);
      },
      glGenBuffers: function (a, b) {
        _glGenObject(a, b, "createBuffer", GL.buffers, "glGenBuffers");
      },
      glBindBuffer: function (b, a) {
        GL.validateGLObjectID(GL.buffers, a, "glBindBuffer", "buffer"),
          gl.bindBuffer(b, GL.buffers[a]);
      },
      glBufferData: function (c, a, b, d) {
        gl.bufferData(c, b ? getArray(b, Uint8Array, a) : a, d);
      },
      glBufferSubData: function (c, d, a, b) {
        gl.bufferSubData(c, d, b ? getArray(b, Uint8Array, a) : a);
      },
      glEnable: function (a) {
        gl.enable(a);
      },
      glFlush: function () {
        gl.flush();
      },
      glFinish: function () {
        gl.finish();
      },
      glDepthFunc: function (a) {
        gl.depthFunc(a);
      },
      glBlendFuncSeparate: function (a, b, c, d) {
        gl.blendFuncSeparate(a, b, c, d);
      },
      glViewport: function (a, b, c, d) {
        gl.viewport(a, b, c, d);
      },
      glDrawArrays: function (a, b, c) {
        gl.drawArrays(a, b, c);
      },
      glCreateProgram: function () {
        var a = GL.getNewId(GL.programs),
          b = gl.createProgram();
        return (b.name = a), (GL.programs[a] = b), a;
      },
      glAttachShader: function (a, b) {
        GL.validateGLObjectID(GL.programs, a, "glAttachShader", "program"),
          GL.validateGLObjectID(GL.shaders, b, "glAttachShader", "shader"),
          gl.attachShader(GL.programs[a], GL.shaders[b]);
      },
      glLinkProgram: function (a) {
        GL.validateGLObjectID(GL.programs, a, "glLinkProgram", "program"),
          gl.linkProgram(GL.programs[a]),
          GL.populateUniformTable(a);
      },
      glPixelStorei: function (a, b) {
        gl.pixelStorei(a, b);
      },
      glFramebufferTexture2D: function (b, c, d, a, e) {
        GL.validateGLObjectID(
          GL.textures,
          a,
          "glFramebufferTexture2D",
          "texture"
        ),
          gl.framebufferTexture2D(b, c, d, GL.textures[a], e);
      },
      glGetProgramiv: function (a, b, c) {
        var e, d;
        if (
          (assert(c),
          GL.validateGLObjectID(GL.programs, a, "glGetProgramiv", "program"),
          a >= GL.counter)
        ) {
          console.error("GL_INVALID_VALUE in glGetProgramiv");
          return;
        }
        if (((e = GL.programInfos[a]), !e)) {
          console.error(
            "GL_INVALID_OPERATION in glGetProgramiv(program=" +
              a +
              ", pname=" +
              b +
              ", p=0x" +
              c.toString(16) +
              "): The specified GL object name does not refer to a program object!"
          );
          return;
        }
        if (b == 35716)
          (d = gl.getProgramInfoLog(GL.programs[a])),
            assert(d !== null),
            (getArray(c, Int32Array, 1)[0] = d.length + 1);
        else if (b == 35719) {
          console.error("unsupported operation");
          return;
        } else if (b == 35722) {
          console.error("unsupported operation");
          return;
        } else if (b == 35381) {
          console.error("unsupported operation");
          return;
        } else
          getArray(c, Int32Array, 1)[0] = gl.getProgramParameter(
            GL.programs[a],
            b
          );
      },
      glCreateShader: function (b) {
        var a = GL.getNewId(GL.shaders);
        return (GL.shaders[a] = gl.createShader(b)), a;
      },
      glStencilFuncSeparate: function (a, b, c, d) {
        gl.stencilFuncSeparate(a, b, c, d);
      },
      glStencilMaskSeparate: function (a, b) {
        gl.stencilMaskSeparate(a, b);
      },
      glStencilOpSeparate: function (a, b, c, d) {
        gl.stencilOpSeparate(a, b, c, d);
      },
      glFrontFace: function (a) {
        gl.frontFace(a);
      },
      glCullFace: function (a) {
        gl.cullFace(a);
      },
      glCopyTexImage2D: function (a, b, c, d, e, f, g, h) {
        gl.copyTexImage2D(a, b, c, d, e, f, g, h);
      },
      glShaderSource: function (b, d, e, f) {
        var a, c;
        GL.validateGLObjectID(GL.shaders, b, "glShaderSource", "shader"),
          (a = GL.getSource(b, d, e, f)),
          emscripten_shaders_hack &&
            ((a = a.replace(
              /#extension GL_OES_standard_derivatives : enable/g,
              ""
            )),
            (a = a.replace(
              /#extension GL_EXT_shader_texture_lod : enable/g,
              ""
            )),
            (c = ""),
            a.indexOf("gl_FragColor") != -1 &&
              ((c += "out mediump vec4 GL_FragColor;\n"),
              (a = a.replace(/gl_FragColor/g, "GL_FragColor"))),
            a.indexOf("attribute") != -1
              ? ((a = a.replace(/attribute/g, "in")),
                (a = a.replace(/varying/g, "out")))
              : (a = a.replace(/varying/g, "in")),
            (a = a.replace(/textureCubeLodEXT/g, "textureCubeLod")),
            (a = a.replace(/texture2DLodEXT/g, "texture2DLod")),
            (a = a.replace(/texture2DProjLodEXT/g, "texture2DProjLod")),
            (a = a.replace(/texture2DGradEXT/g, "texture2DGrad")),
            (a = a.replace(/texture2DProjGradEXT/g, "texture2DProjGrad")),
            (a = a.replace(/textureCubeGradEXT/g, "textureCubeGrad")),
            (a = a.replace(/textureCube/g, "texture")),
            (a = a.replace(/texture1D/g, "texture")),
            (a = a.replace(/texture2D/g, "texture")),
            (a = a.replace(/texture3D/g, "texture")),
            (a = a.replace(/#version 100/g, "#version 300 es\n" + c))),
          gl.shaderSource(GL.shaders[b], a);
      },
      glGetProgramInfoLog: function (d, c, g, e) {
        var b, a;
        GL.validateGLObjectID(GL.programs, d, "glGetProgramInfoLog", "program"),
          (b = gl.getProgramInfoLog(GL.programs[d])),
          assert(b !== null);
        let f = getArray(e, Uint8Array, c);
        for (a = 0; a < c; a++) f[a] = b.charCodeAt(a);
      },
      glCompileShader: function (a, b, c, d) {
        GL.validateGLObjectID(GL.shaders, a, "glCompileShader", "shader"),
          gl.compileShader(GL.shaders[a]);
      },
      glGetShaderiv: function (a, d, b) {
        var e, c, f;
        assert(b),
          GL.validateGLObjectID(GL.shaders, a, "glGetShaderiv", "shader"),
          d == 35716
            ? ((e = gl.getShaderInfoLog(GL.shaders[a])),
              assert(e !== null),
              (getArray(b, Int32Array, 1)[0] = e.length + 1))
            : d == 35720
            ? ((c = gl.getShaderSource(GL.shaders[a])),
              (f = c === null || c.length == 0 ? 0 : c.length + 1),
              (getArray(b, Int32Array, 1)[0] = f))
            : (getArray(b, Int32Array, 1)[0] = gl.getShaderParameter(
                GL.shaders[a],
                d
              ));
      },
      glGetShaderInfoLog: function (d, c, g, e) {
        var b, a;
        GL.validateGLObjectID(GL.shaders, d, "glGetShaderInfoLog", "shader"),
          (b = gl.getShaderInfoLog(GL.shaders[d])),
          assert(b !== null);
        let f = getArray(e, Uint8Array, c);
        for (a = 0; a < c; a++) f[a] = b.charCodeAt(a);
      },
      glVertexAttribDivisor: function (a, b) {
        gl.vertexAttribDivisor(a, b);
      },
      glDrawArraysInstanced: function (a, b, c, d) {
        gl.drawArraysInstanced(a, b, c, d);
      },
      glDrawElementsInstanced: function (a, b, c, d, e) {
        gl.drawElementsInstanced(a, b, c, d, e);
      },
      glDeleteShader: function (a) {
        gl.deleteShader(a);
      },
      glDeleteBuffers: function (d, e) {
        for (var a = 0, c, b; a < d; a++) {
          if (
            ((c = getArray(e + a * 4, Uint32Array, 1)[0]),
            (b = GL.buffers[c]),
            !b)
          )
            continue;
          gl.deleteBuffer(b), (b.name = 0), (GL.buffers[c] = null);
        }
      },
      glDeleteFramebuffers: function (d, e) {
        for (var a = 0, c, b; a < d; a++) {
          if (
            ((c = getArray(e + a * 4, Uint32Array, 1)[0]),
            (b = GL.framebuffers[c]),
            !b)
          )
            continue;
          gl.deleteFramebuffer(b), (b.name = 0), (GL.framebuffers[c] = null);
        }
      },
      glDeleteTextures: function (d, e) {
        for (var a = 0, c, b; a < d; a++) {
          if (
            ((c = getArray(e + a * 4, Uint32Array, 1)[0]),
            (b = GL.textures[c]),
            !b)
          )
            continue;
          gl.deleteTexture(b), (b.name = 0), (GL.textures[c] = null);
        }
      },
      glGenQueries: function (a, b) {
        _glGenObject(a, b, "createQuery", GL.timerQueries, "glGenQueries");
      },
      glDeleteQueries: function (d, e) {
        for (var a = 0, c, b; a < d; a++) {
          if (
            ((c = getArray(textures + a * 4, Uint32Array, 1)[0]),
            (b = GL.timerQueries[c]),
            !b)
          )
            continue;
          gl.deleteQuery(b), (b.name = 0), (GL.timerQueries[c] = null);
        }
      },
      glBeginQuery: function (b, a) {
        GL.validateGLObjectID(GL.timerQueries, a, "glBeginQuery", "id"),
          gl.beginQuery(b, GL.timerQueries[a]);
      },
      glEndQuery: function (a) {
        gl.endQuery(a);
      },
      glGetQueryObjectiv: function (a, b, c) {
        GL.validateGLObjectID(GL.timerQueries, a, "glGetQueryObjectiv", "id");
        let d = gl.getQueryObject(GL.timerQueries[a], b);
        getArray(c, Uint32Array, 1)[0] = d;
      },
      glGetQueryObjectui64v: function (b, d, e) {
        GL.validateGLObjectID(
          GL.timerQueries,
          b,
          "glGetQueryObjectui64v",
          "id"
        );
        let c = gl.getQueryObject(GL.timerQueries[b], d),
          a = getArray(e, Uint32Array, 2);
        (a[0] = c), (a[1] = (c - a[0]) / 4294967296);
      },
      setup_canvas_size: function (a) {
        (window.high_dpi = a), resize(canvas);
      },
      run_animation_loop: function (a) {
        (canvas.onmousemove = function (a) {
          var b = mouse_relative_position(a.clientX, a.clientY),
            c = b.x,
            d = b.y;
          wasm_exports.mouse_move(Math.floor(c), Math.floor(d)),
            (a.movementX != 0 || a.movementY != 0) &&
              wasm_exports.raw_mouse_move(
                Math.floor(a.movementX),
                Math.floor(a.movementY)
              );
        }),
          (canvas.onmousedown = function (a) {
            var b = mouse_relative_position(a.clientX, a.clientY),
              c = b.x,
              d = b.y,
              e = into_sapp_mousebutton(a.button);
            wasm_exports.mouse_down(c, d, e);
          }),
          canvas.addEventListener("wheel", function (a) {
            a.preventDefault(), wasm_exports.mouse_wheel(-a.deltaX, -a.deltaY);
          }),
          (canvas.onmouseup = function (a) {
            var b = mouse_relative_position(a.clientX, a.clientY),
              c = b.x,
              d = b.y,
              e = into_sapp_mousebutton(a.button);
            wasm_exports.mouse_up(c, d, e);
          }),
          (canvas.onkeydown = function (a) {
            var b = into_sapp_keycode(a.code),
              c;
            switch (b) {
              case 32:
              case 262:
              case 263:
              case 264:
              case 265:
              case 290:
              case 291:
              case 292:
              case 293:
              case 294:
              case 295:
              case 296:
              case 297:
              case 298:
              case 299:
              case 259:
              case 258:
              case 39:
              case 47:
                a.preventDefault();
                break;
            }
            (c = 0),
              a.ctrlKey && (c |= SAPP_MODIFIER_CTRL),
              a.shiftKey && (c |= SAPP_MODIFIER_SHIFT),
              a.altKey && (c |= SAPP_MODIFIER_ALT),
              wasm_exports.key_down(b, c, a.repeat),
              (b == 32 || b == 39 || b == 47) && wasm_exports.key_press(b);
          }),
          (canvas.onkeyup = function (a) {
            var b = into_sapp_keycode(a.code);
            wasm_exports.key_up(b);
          }),
          (canvas.onkeypress = function (a) {
            var b = into_sapp_keycode(a.code);
            let c = b == 261 || a.ctrlKey;
            c == !1 && wasm_exports.key_press(a.charCode);
          }),
          canvas.addEventListener("touchstart", function (a) {
            a.preventDefault();
            for (const b of a.changedTouches)
              wasm_exports.touch(
                SAPP_EVENTTYPE_TOUCHES_BEGAN,
                b.identifier,
                Math.floor(b.clientX) * dpi_scale(),
                Math.floor(b.clientY) * dpi_scale()
              );
          }),
          canvas.addEventListener("touchend", function (a) {
            a.preventDefault();
            for (const b of a.changedTouches)
              wasm_exports.touch(
                SAPP_EVENTTYPE_TOUCHES_ENDED,
                b.identifier,
                Math.floor(b.clientX) * dpi_scale(),
                Math.floor(b.clientY) * dpi_scale()
              );
          }),
          canvas.addEventListener("touchcancel", function (a) {
            a.preventDefault();
            for (const b of a.changedTouches)
              wasm_exports.touch(
                SAPP_EVENTTYPE_TOUCHES_CANCELED,
                b.identifier,
                Math.floor(b.clientX) * dpi_scale(),
                Math.floor(b.clientY) * dpi_scale()
              );
          }),
          canvas.addEventListener("touchmove", function (a) {
            a.preventDefault();
            for (const b of a.changedTouches)
              wasm_exports.touch(
                SAPP_EVENTTYPE_TOUCHES_MOVED,
                b.identifier,
                Math.floor(b.clientX) * dpi_scale(),
                Math.floor(b.clientY) * dpi_scale()
              );
          }),
          (window.onresize = function () {
            resize(canvas, wasm_exports.resize);
          }),
          window.addEventListener("copy", function (a) {
            clipboard != null &&
              (event.clipboardData.setData("text/plain", clipboard),
              event.preventDefault());
          }),
          window.addEventListener("cut", function (a) {
            clipboard != null &&
              (event.clipboardData.setData("text/plain", clipboard),
              event.preventDefault());
          }),
          window.addEventListener("paste", function (c) {
            var e, a, b, d, f;
            c.stopPropagation(),
              c.preventDefault(),
              (e = c.clipboardData || window.clipboardData),
              (a = e.getData("Text")),
              a != void 0 &&
                a != null &&
                a.length != 0 &&
                ((b = new TextEncoder().encode(a).length),
                (d = wasm_exports.allocate_vec_u8(b)),
                (f = new Uint8Array(wasm_memory.buffer, d, b)),
                stringToUTF8(a, f, 0, b),
                wasm_exports.on_clipboard_paste(d, b));
          }),
          window.requestAnimationFrame(animation);
      },
      fs_load_file: function (c, d) {
        var e = UTF8ToString(c, d),
          a = FS.unique_id,
          b;
        return (
          (FS.unique_id += 1),
          (b = new XMLHttpRequest()),
          b.open("GET", e, !0),
          (b.responseType = "arraybuffer"),
          (b.onload = function (c) {
            if (this.status == 200) {
              var b = new Uint8Array(this.response);
              (FS.loaded_files[a] = b), wasm_exports.file_loaded(a);
            }
          }),
          (b.onerror = function (b) {
            (FS.loaded_files[a] = null), wasm_exports.file_loaded(a);
          }),
          b.send(),
          a
        );
      },
      fs_get_buffer_size: function (a) {
        return FS.loaded_files[a] == null ? -1 : FS.loaded_files[a].length;
      },
      fs_take_buffer: function (c, e, d) {
        var b = FS.loaded_files[c],
          f,
          a;
        console.assert(b.length <= d),
          (f = new Uint8Array(wasm_memory.buffer, e, d));
        for (a = 0; a < b.length; a++) f[a] = b[a];
        delete FS.loaded_files[c];
      },
      sapp_set_cursor_grab: function (a) {
        a ? canvas.requestPointerLock() : document.exitPointerLock();
      },
      sapp_set_cursor: function (a, b) {
        canvas.style.cursor = UTF8ToString(a, b);
      },
      sapp_is_fullscreen: function () {
        let a = document.fullscreenElement;
        return a != null && a.id == canvas.id;
      },
      sapp_set_fullscreen: function (a) {
        a ? canvas.requestFullscreen() : document.exitFullscreen();
      },
      sapp_set_window_size: function (a, b) {
        (canvas.width = a),
          (canvas.height = b),
          resize(canvas, wasm_exports.resize);
      },
    },
  });
function register_plugins(a) {
  if (a == void 0) return;
  for (var b = 0; b < a.length; b++)
    a[b].register_plugin != void 0 &&
      a[b].register_plugin != null &&
      a[b].register_plugin(importObject);
}
function u32_to_semver(a) {
  let b = (a >> 24) & 255,
    c = (a >> 16) & 255,
    d = a & 65535;
  return b + "." + c + "." + d;
}
function init_plugins(b) {
  var a, c, d;
  if (b == void 0) return;
  for (a = 0; a < b.length; a++)
    b[a].on_init != void 0 && b[a].on_init != null && b[a].on_init(),
      b[a].name == void 0 ||
      b[a].name == null ||
      b[a].version == void 0 ||
      b[a].version == null
        ? (console.warn(
            "Some of the registred plugins do not have name or version"
          ),
          console.warn("Probably old version of the plugin used"))
        : ((c = b[a].name + "_crate_version"),
          wasm_exports[c] == void 0
            ? console.log(
                "Plugin " +
                  b[a].name +
                  " is present in JS bundle, but is not used in the rust code."
              )
            : ((d = u32_to_semver(wasm_exports[c]())),
              b[a].version != d &&
                console.error(
                  "Plugin " +
                    b[a].name +
                    " version mismatch" +
                    "js version: " +
                    b[a].version +
                    ", crate version: " +
                    d
                )));
}
function miniquad_add_plugin(a) {
  plugins.push(a);
}
function add_missing_functions_stabs(b) {
  var a = WebAssembly.Module.imports(b);
  for (const b in a)
    importObject.env[a[b].name] == void 0 &&
      (console.warn("No " + a[b].name + " function in gl.js"),
      (importObject.env[a[b].name] = function () {
        console.warn("Missed function: " + a[b].name);
      }));
}
function load(b) {
  var a = fetch(b);
  register_plugins(plugins),
    typeof WebAssembly.compileStreaming == "function"
      ? WebAssembly.compileStreaming(a)
          .then(
            (a) => (
              add_missing_functions_stabs(a),
              WebAssembly.instantiate(a, importObject)
            )
          )
          .then((a) => {
            (wasm_memory = a.exports.memory), (wasm_exports = a.exports);
            var b = u32_to_semver(wasm_exports.crate_version());
            version != b &&
              console.error(
                "Version mismatch: gl.js version is: " +
                  version +
                  ", rust sapp-wasm crate version is: " +
                  b
              ),
              init_plugins(plugins),
              a.exports.main();
          })
          .catch((a) => {
            console.error(
              "WASM failed to load, probably incompatible gl.js version"
            ),
              console.error(a);
          })
      : a
          .then(function (a) {
            return a.arrayBuffer();
          })
          .then(function (a) {
            return WebAssembly.compile(a);
          })
          .then(function (a) {
            return (
              add_missing_functions_stabs(a),
              WebAssembly.instantiate(a, importObject)
            );
          })
          .then(function (a) {
            (wasm_memory = a.exports.memory), (wasm_exports = a.exports);
            var b = u32_to_semver(wasm_exports.crate_version());
            version != b &&
              console.error(
                "Version mismatch: gl.js version is: " +
                  version +
                  ", rust sapp-wasm crate version is: " +
                  b
              ),
              init_plugins(plugins),
              a.exports.main();
          })
          .catch((a) => {
            console.error(
              "WASM failed to load, probably incompatible gl.js version"
            ),
              console.error(a);
          });
}
(register_plugin = function (a) {
  (a.env.js_create_string = function (a, b) {
    var c = UTF8ToString(a, b);
    return js_object(c);
  }),
    (a.env.js_create_buffer = function (c, d) {
      var a = new Uint8Array(wasm_memory.buffer, c, d),
        b = new Uint8Array(new ArrayBuffer(a.byteLength));
      return b.set(new Uint8Array(a)), js_object(b);
    }),
    (a.env.js_create_object = function () {
      var a = {};
      return js_object(a);
    }),
    (a.env.js_set_field_f32 = function (a, b, c, d) {
      var e = UTF8ToString(b, c);
      js_objects[a][e] = d;
    }),
    (a.env.js_set_field_string = function (a, b, c, d, e) {
      var f = UTF8ToString(b, c),
        g = UTF8ToString(d, e);
      js_objects[a][f] = g;
    }),
    (a.env.js_unwrap_to_str = function (c, h, d) {
      for (
        var e = js_objects[c],
          b = toUTF8Array(e),
          f = b.length,
          g = new Uint8Array(wasm_memory.buffer, h, d),
          a = 0;
        a < f;
        a++
      )
        g[a] = b[a];
    }),
    (a.env.js_unwrap_to_buf = function (g, c, d) {
      for (
        var b = js_objects[g],
          e = b.length,
          f = new Uint8Array(wasm_memory.buffer, c, d),
          a = 0;
        a < e;
        a++
      )
        f[a] = b[a];
    }),
    (a.env.js_string_length = function (a) {
      var b = js_objects[a];
      return toUTF8Array(b).length;
    }),
    (a.env.js_buf_length = function (a) {
      var b = js_objects[a];
      return b.length;
    }),
    (a.env.js_free_object = function (a) {
      delete js_objects[a];
    }),
    (a.env.js_have_field = function (a, b, c) {
      var d = UTF8ToString(b, c);
      return js_objects[a][d] !== void 0;
    }),
    (a.env.js_field_num = function (a, b, c) {
      var d = UTF8ToString(b, c);
      return js_objects[a][d];
    }),
    (a.env.js_field = function (b, c, d) {
      var e = UTF8ToString(c, d),
        f = js_objects[b][e],
        a = unique_js_id;
      return (js_objects[a] = f), (unique_js_id += 1), a;
    });
}),
  miniquad_add_plugin({
    register_plugin,
    version: "0.1.5",
    name: "sapp_jsutils",
  });
function toUTF8Array(d) {
  for (var b = [], c = 0, a; c < d.length; c++)
    (a = d.charCodeAt(c)),
      a < 128
        ? b.push(a)
        : a < 2048
        ? b.push(192 | (a >> 6), 128 | (a & 63))
        : a < 55296 || a >= 57344
        ? b.push(224 | (a >> 12), 128 | ((a >> 6) & 63), 128 | (a & 63))
        : (c++,
          (a = 65536 + (((a & 1023) << 10) | (d.charCodeAt(c) & 1023))),
          b.push(
            240 | (a >> 18),
            128 | ((a >> 12) & 63),
            128 | ((a >> 6) & 63),
            128 | (a & 63)
          ));
  return b;
}
function js_object(b) {
  var a = unique_js_id;
  return (js_objects[a] = b), (unique_js_id += 1), a;
}
function consume_js_object(a) {
  var b = js_objects[a];
  return delete js_objects[a], b;
}
function get_js_object(a) {
  return js_objects[a];
}
function on_init() {}
(register_plugin = function (a) {
  (a.env.ws_connect = ws_connect),
    (a.env.ws_is_connected = ws_is_connected),
    (a.env.ws_send = ws_send),
    (a.env.ws_try_recv = ws_try_recv),
    (a.env.http_make_request = http_make_request),
    (a.env.http_try_recv = http_try_recv);
}),
  miniquad_add_plugin({
    register_plugin,
    on_init,
    version: "0.1.1",
    name: "quad_net",
  });
(connected = 0), (received_buffer = []);
function ws_is_connected() {
  return connected;
}
function ws_connect(a) {
  (quad_socket = new WebSocket(consume_js_object(a))),
    (quad_socket.binaryType = "arraybuffer"),
    (quad_socket.onopen = function () {
      connected = 1;
    }),
    (quad_socket.onmessage = function (a) {
      if (typeof a.data == "string")
        received_buffer.push({ text: 1, data: a.data });
      else {
        var b = new Uint8Array(a.data);
        received_buffer.push({ text: 0, data: b });
      }
    });
}
function ws_send(b) {
  var a = consume_js_object(b);
  a.buffer != void 0 ? quad_socket.send(a.buffer) : quad_socket.send(a);
}
function ws_try_recv() {
  return received_buffer.length != 0 ? js_object(received_buffer.shift()) : -1;
}
(uid = 0), (ongoing_requests = {});
function http_try_recv(a) {
  if (ongoing_requests[a] != void 0 && ongoing_requests[a] != null) {
    var b = ongoing_requests[a];
    return (ongoing_requests[a] = null), js_object(b);
  }
  return -1;
}
function http_make_request(c, f, i, j) {
  var e = uid,
    b,
    g,
    h,
    d,
    a;
  uid += 1;
  c == 0 && (b = "POST"),
    c == 1 && (b = "PUT"),
    c == 2 && (b = "GET"),
    c == 3 && (b = "DELETE"),
    (g = consume_js_object(f)),
    (h = consume_js_object(i)),
    (d = consume_js_object(j)),
    (a = new XMLHttpRequest()),
    a.open(b, g, !0),
    (a.responseType = "arraybuffer");
  for (const b in d) a.setRequestHeader(b, d[b]);
  return (
    (a.onload = function (b) {
      if (this.status == 200) {
        var a = new Uint8Array(this.response);
        ongoing_requests[e] = a;
      }
    }),
    (a.onerror = function (a) {
      console.error("Failed to make a request"), console.error(a);
    }),
    a.send(h),
    e
  );
}

export default load;
