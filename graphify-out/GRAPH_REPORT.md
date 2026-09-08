# Graph Report - physio-web  (2026-09-08)

## Corpus Check
- 58 files · ~93,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 990 nodes · 1671 edges · 62 communities (35 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- MediaPipe WASM SIMD
- MediaPipe WASM NoSIMD
- UI Components
- Doctor Dashboard + Auth
- App Router + Shell
- Runtime Dependencies
- Dev Dependencies
- Dialog Components
- TypeScript Config
- WASM SIMD Init/Run
- WASM NoSIMD Init/Run
- WASM SIMD Exception Info
- WASM NoSIMD Exception Info
- WASM SIMD Filesystem
- WASM NoSIMD Filesystem
- Build Config
- Setup Scripts
- Error Boundary
- HTML Entry Point
- WASM SIMD Buffer/Entry
- WASM NoSIMD Buffer/Entry
- WASM SIMD Init
- WASM SIMD Runtime
- WASM SIMD Blend/Color
- WASM SIMD Vertex Buffer
- WASM NoSIMD Init
- WASM NoSIMD Runtime
- WASM NoSIMD Blend/Color
- WASM NoSIMD Vertex Buffer
- WASM SIMD Fullscreen
- WASM SIMD IOCTL
- WASM SIMD Render Pass
- WASM NoSIMD Fullscreen
- WASM NoSIMD IOCTL
- WASM NoSIMD Render Pass
- WASM SIMD Write/MSync
- WASM SIMD SyncFS
- WASM NoSIMD Write/MSync
- WASM NoSIMD SyncFS
- Vite Env Types
- WASM SIMD Close/Fsync
- WASM SIMD Convert/Done
- WASM SIMD Debug
- WASM SIMD Error Handling
- WASM SIMD Exit Status
- WASM SIMD Wire Type
- WASM SIMD Path Lookup
- WASM SIMD Depth Stencil
- WASM SIMD Type Registry
- WASM SIMD StatFS
- WASM NoSIMD Close/Fsync
- WASM NoSIMD Convert/Done
- WASM NoSIMD Debug
- WASM NoSIMD Error Handling
- WASM NoSIMD Exit Status
- WASM NoSIMD Wire Type
- WASM NoSIMD Path Lookup
- WASM NoSIMD Depth Stencil
- WASM NoSIMD Type Registry
- WASM NoSIMD StatFS
- Favicon Asset

## God Nodes (most connected - your core abstractions)
1. `cn()` - 47 edges
2. `useAuth()` - 35 edges
3. `compilerOptions` - 18 edges
4. `Button` - 17 edges
5. `useToast()` - 17 edges
6. `WorkoutView()` - 16 edges
7. `ExceptionInfo` - 13 edges
8. `ExceptionInfo` - 13 edges
9. `SessionRecord` - 12 edges
10. `Badge()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AuthUser` --references--> `Role`  [EXTRACTED]
  src/hooks/useAuth.tsx → src/types/index.ts
- `GuestRoute()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/routes.tsx → src/hooks/useAuth.tsx
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/routes.tsx → src/hooks/useAuth.tsx
- `DoctorRoute()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/routes.tsx → src/hooks/useAuth.tsx
- `PatientRoute()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/routes.tsx → src/hooks/useAuth.tsx

## Import Cycles
- None detected.

## Communities (62 total, 26 thin omitted)

### Community 0 - "MediaPipe WASM SIMD"
Cohesion: 0.01
Nodes (16): RFC-2279, RFC-3629, NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and, TODO: Use mozResponseArrayBuffer, responseStream, etc. if available., TODO: in theory we should write to the winsize struct that gets (+8 more)

### Community 1 - "MediaPipe WASM NoSIMD"
Cohesion: 0.01
Nodes (16): RFC-2279, RFC-3629, NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),, NOTE: This is also used as the process return code in shell environments, TODO: check for O_SEARCH? (== search for dir only), NOTE: None of the defaults here are true. We're just returning safe and, TODO: Use mozResponseArrayBuffer, responseStream, etc. if available., TODO: in theory we should write to the winsize struct that gets (+8 more)

### Community 2 - "UI Components"
Cohesion: 0.06
Nodes (78): EmptyState(), EmptyStateProps, PageSkeleton(), chartData(), formatDate(), SessionChart(), SessionSummaryChart(), Badge() (+70 more)

### Community 3 - "Doctor Dashboard + Auth"
Cohesion: 0.07
Nodes (59): daysSinceLast(), DoctorDashboard(), AuthContext, AuthContextValue, AuthProvider(), AuthUser, readDemoSession(), recordToAuthUser() (+51 more)

### Community 4 - "App Router + Shell"
Cohesion: 0.06
Nodes (48): App(), AppRoutes(), DoctorDashboard, DoctorRoute(), GuestRoute(), OnboardingRoute(), PatientDetailPage, PatientProfilePage (+40 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (38): firebase, @mediapipe/tasks-vision, dependencies, firebase, @mediapipe/tasks-vision, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-label (+30 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): class-variance-authority, clsx, lucide-react, devDependencies, class-variance-authority, clsx, lucide-react, @radix-ui/react-slot (+19 more)

### Community 7 - "Dialog Components"
Cohesion: 0.13
Nodes (21): CardFooter, DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, SelectContent (+13 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+16 more)

### Community 9 - "WASM SIMD Init/Run"
Cohesion: 0.12
Nodes (17): abort(), assert(), assignWasmExports(), createWasm(), receiveInstance(), receiveInstantiationResult(), findWasmBinary(), forceLoadFile() (+9 more)

### Community 10 - "WASM NoSIMD Init/Run"
Cohesion: 0.12
Nodes (17): abort(), assert(), assignWasmExports(), createWasm(), receiveInstance(), receiveInstantiationResult(), findWasmBinary(), forceLoadFile() (+9 more)

### Community 13 - "WASM SIMD Filesystem"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 14 - "WASM NoSIMD Filesystem"
Cohesion: 0.31
Nodes (7): createLazyFile(), stream_ops, writeChunks(), get_char(), mmap(), position(), read()

### Community 15 - "Build Config"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 16 - "Setup Scripts"
Cohesion: 0.29
Nodes (5): modelDest, root, WASM_FILES, wasmDest, wasmSrc

### Community 17 - "Error Boundary"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 18 - "HTML Entry Point"
Cohesion: 0.47
Nodes (6): index.html Entry Point, Dark Theme Bootstrapping, Favicon Asset, PhysioAI Platform, Root Mount Node, main.tsx Application Bootstrap

### Community 19 - "WASM SIMD Buffer/Entry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 20 - "WASM NoSIMD Buffer/Entry"
Cohesion: 0.33
Nodes (6): makeBufferEntry(), makeEntries(), makeEntry(), makeSamplerEntry(), makeStorageTextureEntry(), makeTextureEntry()

### Community 22 - "WASM SIMD Runtime"
Cohesion: 0.40
Nodes (5): initRuntime(), postRun(), preRun(), run(), doRun()

### Community 23 - "WASM SIMD Blend/Color"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 24 - "WASM SIMD Vertex Buffer"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 26 - "WASM NoSIMD Runtime"
Cohesion: 0.40
Nodes (5): initRuntime(), postRun(), preRun(), run(), doRun()

### Community 27 - "WASM NoSIMD Blend/Color"
Cohesion: 0.40
Nodes (5): makeBlendComponent(), makeBlendState(), makeColorState(), makeColorStates(), makeFragmentState()

### Community 28 - "WASM NoSIMD Vertex Buffer"
Cohesion: 0.40
Nodes (5): makeVertexAttribute(), makeVertexAttributes(), makeVertexBuffer(), makeVertexBuffers(), makeVertexState()

### Community 29 - "WASM SIMD Fullscreen"
Cohesion: 0.50
Nodes (4): getFullscreenElement(), requestFullscreen(), fullscreenChange(), updateCanvasDimensions()

### Community 30 - "WASM SIMD IOCTL"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 31 - "WASM SIMD Render Pass"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 32 - "WASM NoSIMD Fullscreen"
Cohesion: 0.50
Nodes (4): getFullscreenElement(), requestFullscreen(), fullscreenChange(), updateCanvasDimensions()

### Community 33 - "WASM NoSIMD IOCTL"
Cohesion: 0.50
Nodes (4): ioctl_tcgets(), ioctl_tcsets(), ioctl_tiocgwinsz(), ___syscall_ioctl()

### Community 34 - "WASM NoSIMD Render Pass"
Cohesion: 0.50
Nodes (4): makeColorAttachment(), makeColorAttachments(), makeDepthStencilAttachment(), makeRenderPassDescriptor()

### Community 35 - "WASM SIMD Write/MSync"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

### Community 36 - "WASM SIMD SyncFS"
Cohesion: 1.00
Nodes (3): syncfs(), doCallback(), done()

### Community 37 - "WASM NoSIMD Write/MSync"
Cohesion: 0.67
Nodes (3): msync(), put_char(), write()

### Community 38 - "WASM NoSIMD SyncFS"
Cohesion: 1.00
Nodes (3): syncfs(), doCallback(), done()

## Knowledge Gaps
- **104 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 536 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Dialog Components` to `UI Components`, `App Router + Shell`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `ExceptionInfo` connect `WASM SIMD Exception Info` to `MediaPipe WASM SIMD`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `ExceptionInfo` connect `WASM NoSIMD Exception Info` to `MediaPipe WASM NoSIMD`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MediaPipe WASM SIMD` be split into smaller, more focused modules?**
  _Cohesion score 0.01020408163265306 - nodes in this community are weakly interconnected._
- **Should `MediaPipe WASM NoSIMD` be split into smaller, more focused modules?**
  _Cohesion score 0.010256410256410256 - nodes in this community are weakly interconnected._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.0594059405940594 - nodes in this community are weakly interconnected._