var BG = (function () {
  var renderer, scene, camera, clock, grid, dots, orbs;
  var scroll = 0, mx = 0.5, my = 0.5;

  var gV = [
    "uniform float t;",
    "uniform float s;",
    "varying vec2 uv2;",
    "varying float vD;",
    "void main(){",
    "  uv2=uv;",
    "  vec3 p=position;",
    "  float r=length(p.xy);",
    "  p.z+=sin(p.x*0.8+t*0.28)*cos(p.y*0.8+t*0.18)*0.35;",
    "  p.z+=sin(r*0.4-t*0.1)*0.3;",
    "  p.z+=cos(p.x*0.3+p.y*0.5+t*0.12)*0.2;",
    "  p.z+=sin(p.x*1.5+p.y*0.8+t*0.22)*0.08;",
    "  p.z-=s*0.0005;",
    "  vD=r;",
    "  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);",
    "}"
  ].join("\n");

  var gF = [
    "varying vec2 uv2;",
    "varying float vD;",
    "uniform float t;",
    "uniform vec2 m;",
    "void main(){",
    "  float gx=step(0.97,fract(uv2.x*35.0));",
    "  float gy=step(0.97,fract(uv2.y*35.0));",
    "  float fine=max(gx,gy);",
    "  float cx=step(0.99,fract(uv2.x*7.0));",
    "  float cy=step(0.99,fract(uv2.y*7.0));",
    "  float coarse=max(cx,cy);",
    "  float v=smoothstep(10.0,0.0,vD);",
    "  float md=length(uv2-m);",
    "  float mg=0.04/(md+0.12);",
    "  float center=0.015/(length(uv2-0.5)+0.12);",
    "  float wave=0.5+0.5*sin(vD*0.8-t*0.3);",
    "  float pulse=0.6+0.4*sin(t*0.18);",
    "  float a=(fine*0.03+coarse*0.02)*v*pulse;",
    "  a+=mg*v*0.005;",
    "  a+=center*v*0.005;",
    "  a*=0.7+wave*0.3;",
    "  float fy=smoothstep(0.0,0.12,uv2.y)*smoothstep(1.0,0.88,uv2.y);",
    "  float fx=smoothstep(0.0,0.12,uv2.x)*smoothstep(1.0,0.88,uv2.x);",
    "  a*=fy*fx;",
    "  vec3 col=vec3(0.6,0.6,0.68);",
    "  col+=mg*vec3(0.05,0.05,0.07)*v;",
    "  gl_FragColor=vec4(col,a);",
    "}"
  ].join("\n");

  var dV = [
    "attribute float sz;",
    "attribute float off;",
    "attribute float spd;",
    "varying float va;",
    "varying float vSize;",
    "uniform float t;",
    "uniform float s;",
    "void main(){",
    "  vec3 p=position;",
    "  p.x+=sin(t*0.08*spd+off*6.28)*1.2;",
    "  p.y+=cos(t*0.06*spd+off*4.2)*0.9;",
    "  p.y-=mod(s*0.003+off*24.0,30.0)-15.0;",
    "  p.z+=sin(t*0.05*spd+off*7.0)*0.6;",
    "  vec4 mv=modelViewMatrix*vec4(p,1.0);",
    "  gl_Position=projectionMatrix*mv;",
    "  gl_PointSize=sz*(160.0/-mv.z);",
    "  va=0.06+0.1*sin(t*0.2+off*3.0);",
    "  va*=smoothstep(22.0,3.0,-mv.z);",
    "  vSize=sz;",
    "}"
  ].join("\n");

  var dF = [
    "varying float va;",
    "varying float vSize;",
    "void main(){",
    "  float d=length(gl_PointCoord-0.5);",
    "  if(d>0.5)discard;",
    "  float core=smoothstep(0.5,0.0,d);",
    "  float ring=smoothstep(0.5,0.35,d)*smoothstep(0.25,0.35,d);",
    "  float a=(core*0.8+ring*0.15)*va;",
    "  vec3 col=vec3(0.55,0.55,0.62);",
    "  gl_FragColor=vec4(col,a);",
    "}"
  ].join("\n");

  var orbV = [
    "varying vec3 vN;",
    "varying vec3 vP;",
    "uniform float t;",
    "void main(){",
    "  vN=normalize(normalMatrix*normal);",
    "  vP=position;",
    "  vec3 p=position;",
    "  p+=normal*sin(p.x*3.0+t*0.5)*0.03;",
    "  p+=normal*cos(p.y*4.0+t*0.4)*0.02;",
    "  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);",
    "}"
  ].join("\n");

  var orbF = [
    "varying vec3 vN;",
    "varying vec3 vP;",
    "uniform float t;",
    "void main(){",
    "  float rim=1.0-abs(dot(vN,vec3(0.0,0.0,1.0)));",
    "  rim=pow(rim,3.0);",
    "  float pulse=0.5+0.5*sin(t*0.3+vP.y*2.0);",
    "  float a=rim*0.12*pulse;",
    "  vec3 col=vec3(0.6,0.6,0.7);",
    "  gl_FragColor=vec4(col,a);",
    "}"
  ].join("\n");

  function init() {
    var el = document.getElementById("c");
    if (!el) return;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    camera.position.z = 10;
    renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    clock = new THREE.Clock();
    makeGrid();
    makeDots();
    makeOrbs();
    addEventListener("resize", onResize);
    addEventListener("mousemove", function (e) {
      mx = e.clientX / innerWidth;
      my = 1 - e.clientY / innerHeight;
    });
    loop();
  }

  function makeGrid() {
    var geo = new THREE.PlaneGeometry(30, 30, 110, 110);
    var mat = new THREE.ShaderMaterial({
      vertexShader: gV,
      fragmentShader: gF,
      uniforms: { t: { value: 0 }, s: { value: 0 }, m: { value: new THREE.Vector2(0.5, 0.5) } },
      transparent: true,
      depthWrite: false,
    });
    grid = new THREE.Mesh(geo, mat);
    grid.rotation.x = -0.72;
    grid.position.y = -4;
    grid.position.z = -6;
    scene.add(grid);
  }

  function makeDots() {
    var n = 350;
    var pos = new Float32Array(n * 3);
    var sz = new Float32Array(n);
    var off = new Float32Array(n);
    var spd = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 3;
      sz[i] = Math.random() * 2.8 + 0.3;
      off[i] = Math.random();
      spd[i] = 0.5 + Math.random() * 1.5;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("sz", new THREE.BufferAttribute(sz, 1));
    geo.setAttribute("off", new THREE.BufferAttribute(off, 1));
    geo.setAttribute("spd", new THREE.BufferAttribute(spd, 1));
    var mat = new THREE.ShaderMaterial({
      vertexShader: dV,
      fragmentShader: dF,
      uniforms: { t: { value: 0 }, s: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    dots = new THREE.Points(geo, mat);
    scene.add(dots);
  }

  function makeOrbs() {
    orbs = [];
    var positions = [
      { x: -5, y: 2, z: -4, s: 1.2 },
      { x: 6, y: -1, z: -5, s: 0.8 },
      { x: 0, y: 4, z: -7, s: 1.5 },
    ];
    positions.forEach(function (p) {
      var geo = new THREE.IcosahedronGeometry(p.s, 3);
      var mat = new THREE.ShaderMaterial({
        vertexShader: orbV,
        fragmentShader: orbF,
        uniforms: { t: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.userData = { ox: p.x, oy: p.y, oz: p.z };
      scene.add(mesh);
      orbs.push(mesh);
    });
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }

  function loop() {
    requestAnimationFrame(loop);
    var e = clock.getElapsedTime();
    if (grid) {
      grid.material.uniforms.t.value = e;
      grid.material.uniforms.s.value = scroll;
      grid.material.uniforms.m.value.set(mx, my);
      grid.rotation.y = Math.sin(e * 0.03) * 0.04;
      grid.rotation.z = Math.cos(e * 0.02) * 0.015;
    }
    if (dots) {
      dots.material.uniforms.t.value = e;
      dots.material.uniforms.s.value = scroll;
      dots.rotation.y = e * 0.003;
    }
    if (orbs) {
      orbs.forEach(function (orb, i) {
        orb.material.uniforms.t.value = e;
        var d = orb.userData;
        orb.position.x = d.ox + Math.sin(e * 0.08 + i * 2) * 0.6;
        orb.position.y = d.oy + Math.cos(e * 0.06 + i * 3) * 0.4;
        orb.position.y -= scroll * 0.002;
        orb.rotation.x = e * 0.05 + i;
        orb.rotation.y = e * 0.04 + i * 0.5;
      });
    }
    camera.position.x += (mx * 0.6 - 0.3 - camera.position.x) * 0.01;
    camera.position.y += (my * 0.4 - 0.2 - camera.position.y) * 0.01;
    camera.lookAt(0, -1.5, 0);
    renderer.render(scene, camera);
  }

  function setScroll(v) { scroll = v; }
  return { init: init, setScroll: setScroll };
})();