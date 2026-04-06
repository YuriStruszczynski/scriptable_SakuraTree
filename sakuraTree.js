/**
 * Sakura Widget — Generative Cherry Tree for Scriptable
 *
 * Author: Yuri Struszczynski
 * Version: 1.0.0
 * Target: Scriptable (iOS)
 *
 * Description:
 * This script renders a generative Japanese cherry tree (sakura) as a widget
 * using Scriptable's drawing APIs. The tree evolves over time through discrete
 * growth stages instead of continuous animation.
 *
 * Core Features:
 * - Space colonization based tree generation
 * - Procedural trunk and branch structure
 * - Stage-based growth system (no timer animation)
 * - Shoot, bud, blossom and petal phases
 * - Seed-based deterministic rendering
 * - Persistent state via Keychain
 * - Optimized rendering for small widgets
 *
 * Widget Behavior:
 * - Each widget refresh increments the growth stage
 * - iOS controls refresh timing (typically every 10–15 minutes)
 * - After the final stage, the cycle restarts
 *
 * Configuration:
 * - Style profiles (natural, minimal, ornamental)
 * - Custom colors (background, branches, blossoms, sun, ground)
 * - Optional sun rendering
 * - Seed for reproducible tree shapes
 *
 * Notes:
 * - No continuous animation due to iOS widget limitations
 * - refreshAfterDate is a hint, not guaranteed
 * - Designed primarily for visual clarity on small widgets
 *
 * License:
 * MIT
 *
 * Repository:
 * https://github.com/YuriStruszczynski/scriptable_SakuraTree/
 *
 * -----------------------------------------------------------------------------
 */

const STORAGE_KEY = "sakura_widget_settings_v13"
const PHASE_KEY = "sakura_widget_phase_v13"

const DEFAULT_SETTINGS = {
  style: "natural",
  bgColor: "#fcf7f8",
  branchColor: "#111111",
  blossomColor: "#d98aa0",
  sunColor: "#e35b5b",
  groundColor: "#cbb7b1",
  showSun: true,
  previewFamily: "medium",
  seed: 12345
}

const STAGES = [
  { growth: 0.10, thickness: 0.18, buds: 0.00, flowers: 0.00, petals: 0.00 },
  { growth: 0.22, thickness: 0.32, buds: 0.00, flowers: 0.00, petals: 0.00 },
  { growth: 0.38, thickness: 0.50, buds: 0.00, flowers: 0.00, petals: 0.00 },
  { growth: 0.58, thickness: 0.72, buds: 0.00, flowers: 0.00, petals: 0.00 },
  { growth: 0.78, thickness: 0.88, buds: 0.00, flowers: 0.00, petals: 0.00 },
  { growth: 1.00, thickness: 0.96, buds: 0.00, flowers: 0.00, petals: 0.00 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, shoots: true, shootProgress: 0.35, shootTipStage: 0 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, shoots: true, shootProgress: 1.00, shootTipStage: 0 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, shoots: true, shootProgress: 1.00, shootTipStage: 1 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, shoots: true, shootProgress: 1.00, shootTipStage: 2 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, shoots: true, shootProgress: 1.00, shootTipStage: 3 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, shoots: true, shootProgress: 1.00, shootTipStage: 4 },
  { growth: 1.00, thickness: 1.00, buds: 0.42, flowers: 1.00, petals: 0.00, shoots: true, shootProgress: 1.00, shootTipStage: 4, maxBloom: true },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.38, petals: 1.00, petalBoost: 1.8, shoots: true, shootProgress: 1.00, shootTipStage: 4 },
  { growth: 1.00, thickness: 1.00, buds: 0.00, flowers: 0.00, petals: 0.00, bare: true, shoots: true, shootProgress: 1.00, shootTipStage: 0 }
]

const STYLES = {
  natural: {
    label: "Natuerlich",
    crownWidth: 0.36,
    crownHeight: 0.28,
    targetCountSmall: 110,
    targetCountMedium: 220,
    targetCountLarge: 340,
    killDistance: 20,
    attractionDistance: 90,
    segmentLength: 12,
    trunkCurve: 0.10,
    lateralBias: 1.0,
    droopOuter: 0.18
  },
  minimal: {
    label: "Minimalistisch",
    crownWidth: 0.30,
    crownHeight: 0.23,
    targetCountSmall: 80,
    targetCountMedium: 140,
    targetCountLarge: 220,
    killDistance: 24,
    attractionDistance: 85,
    segmentLength: 14,
    trunkCurve: 0.05,
    lateralBias: 0.8,
    droopOuter: 0.10
  },
  ornamental: {
    label: "Ornamental",
    crownWidth: 0.40,
    crownHeight: 0.31,
    targetCountSmall: 130,
    targetCountMedium: 260,
    targetCountLarge: 400,
    killDistance: 18,
    attractionDistance: 95,
    segmentLength: 11,
    trunkCurve: 0.12,
    lateralBias: 1.15,
    droopOuter: 0.20
  }
}

function loadSettings() {
  if (!Keychain.contains(STORAGE_KEY)) {
    saveSettings(DEFAULT_SETTINGS)
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const parsed = JSON.parse(Keychain.get(STORAGE_KEY))
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch (e) {
    saveSettings(DEFAULT_SETTINGS)
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings) {
  Keychain.set(STORAGE_KEY, JSON.stringify(settings))
}

function loadPhaseIndex() {
  if (!Keychain.contains(PHASE_KEY)) {
    Keychain.set(PHASE_KEY, "0")
    return 0
  }

  const raw = Keychain.get(PHASE_KEY)
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed)) {
    Keychain.set(PHASE_KEY, "0")
    return 0
  }

  return ((parsed % STAGES.length) + STAGES.length) % STAGES.length
}

function savePhaseIndex(index) {
  const normalized = ((index % STAGES.length) + STAGES.length) % STAGES.length
  Keychain.set(PHASE_KEY, String(normalized))
}

function incrementPhaseIndex() {
  const current = loadPhaseIndex()
  const next = (current + 1) % STAGES.length
  savePhaseIndex(next)
  return next
}

function resetPhaseIndex() {
  savePhaseIndex(0)
}

function normalizeHex(input, fallback) {
  if (!input) return fallback
  let v = String(input).trim()
  if (!v.startsWith("#")) v = "#" + v
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function normalizeVec(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1
  return { x: x / len, y: y / len }
}

function familyCanvasSize(family) {
  if (family === "small") return { w: 340, h: 340 }
  if (family === "large") return { w: 900, h: 950 }
  return { w: 900, h: 430 }
}

function familyImageSize(family) {
  if (family === "small") return new Size(155, 155)
  if (family === "large") return new Size(320, 338)
  return new Size(320, 155)
}

function branchWidthFromRadius(radius, family, isTrunk) {
  let scale = 1.0
  if (family === "small") scale = 1.08
  if (family === "large") scale = 1.28

  let w = radius * scale

  if (isTrunk) {
    w *= 1.35
  }

  if (family === "small") return Math.max(1.9, w)
  return Math.max(2.0, w)
}

function targetCountForFamily(styleCfg, family) {
  if (family === "small") return styleCfg.targetCountSmall
  if (family === "large") return styleCfg.targetCountLarge
  return styleCfg.targetCountMedium
}

function generateAttractionPoints(width, height, styleCfg, rnd, family) {
  const count = targetCountForFamily(styleCfg, family)
  const points = []

  const cx = width * 0.52
  const cy = height * 0.39
  const rx = width * styleCfg.crownWidth
  const rxLeft = rx * 0.85
  const rxRight = rx * 0.90
  const ry = height * styleCfg.crownHeight

  for (let i = 0; i < count; i++) {
    let tries = 0
    while (tries < 24) {
      tries++
      const px = cx + (rnd() * 2 - 1) * rx
      const py = cy + (rnd() * 2 - 1) * ry
      const dx = px >= cx ? (px - cx) / rxRight : (px - cx) / rxLeft
      const dy = (py - cy) / ry

      let shape = dx * dx + dy * dy
      shape += Math.max(0, dy) * 0.14
      shape += Math.max(0, Math.abs(dx) - 0.55) * 0.12

      if (shape < 1.0) {
        if (py < height * 0.17) continue
        if (py > height * 0.72) continue
        points.push({ x: px, y: py, alive: true })
        break
      }
    }
  }

  return points
}

function buildInitialSkeleton(width, height, styleCfg, rnd, family) {
  const nodes = []
  const segments = []

  function addNode(x, y, parent, depth, vitality, trunkLevel = 0) {
    const node = {
      id: nodes.length,
      x,
      y,
      parent,
      children: [],
      depth,
      vitality,
      radius: 1,
      terminal: true,
      trunkLevel
    }
    nodes.push(node)
    if (parent !== null) {
      nodes[parent].children.push(node.id)
      nodes[parent].terminal = false
      segments.push({ a: parent, b: node.id, order: depth })
    }
    return node.id
  }

  const rootX = width * 0.455
  const rootY = height * 0.88
  const root = addNode(rootX, rootY, null, 0, 1.0, 3)

  let prev = root
  const trunkSteps = family === "small" ? 6 : family === "large" ? 11 : 8
  const trunkLen = height * (family === "small" ? 0.045 : family === "large" ? 0.050 : 0.048)
  let swayAccum = 0

  for (let i = 0; i < trunkSteps; i++) {
    const t = i / Math.max(1, trunkSteps - 1)
    swayAccum += (rnd() * 2 - 1) * width * styleCfg.trunkCurve * 0.06
    swayAccum *= 0.82

    const curveX = Math.sin(t * Math.PI * 1.15) * width * 0.018 + swayAccum
    const x = nodes[prev].x + curveX
    const y = nodes[prev].y - trunkLen * (1.0 - t * 0.08)

    prev = addNode(x, y, prev, i + 1, clamp(1.0 - i * 0.06, 0.55, 1.0), 3)
  }

  const trunkTop = prev
  const mainBranches = family === "small" ? 3 : family === "large" ? 5 : 4

  for (let i = 0; i < mainBranches; i++) {
    const side = i < Math.ceil(mainBranches / 2) ? -1 : 1
    const spreadIndex = i % Math.ceil(mainBranches / 2)
    const anchorOffset = 1 + spreadIndex
    const baseNodeIndex = Math.max(1, trunkTop - anchorOffset)
    let current = baseNodeIndex

    const baseAngle = side < 0 ? (-2.35 - spreadIndex * 0.18) : (-0.80 + spreadIndex * 0.18)
    const angleEastBias = 0.09
    const angle = baseAngle + (rnd() * 0.24 - 0.12) + angleEastBias

    let localLen = height * (family === "small" ? 0.050 : family === "large" ? 0.060 : 0.055)
    const segCount = family === "small" ? 2 : family === "large" ? 4 : 3

    for (let s = 0; s < segCount; s++) {
      const bend = side * 0.08 * s
      const a = angle + bend + (rnd() * 0.12 - 0.06)
      const nx = nodes[current].x + Math.cos(a) * localLen
      const ny = nodes[current].y + Math.sin(a) * localLen

      current = addNode(
        nx,
        ny,
        current,
        nodes[current].depth + 1,
        clamp(0.92 - s * 0.09, 0.45, 0.95),
        s < 2 ? 2 : 1
      )

      localLen *= 0.92
    }
  }

  return { nodes, segments, root, trunkTop }
}

function computeRadii(nodes) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]

    if (n.children.length === 0) {
      n.radius = clamp(1.3 - n.depth * 0.02, 0.85, 1.8)
      continue
    }

    let sum = 0
    for (const childId of n.children) {
      const r = nodes[childId].radius
      sum += r * r
    }

    let r = Math.sqrt(sum) * 0.98 + 0.35

    if (n.trunkLevel === 3) {
      const trunkBoost = clamp(4.4 - n.depth * 0.28, 1.2, 4.4)
      r += trunkBoost
    }
    if (n.trunkLevel === 2) r += 1.2
    if (n.trunkLevel === 1) r += 0.45
    if (n.depth <= 2) r = Math.max(r, 6.5 - n.depth * 0.8)

    n.radius = r
  }
}

function collectBlossomPoints(nodes, seed, family) {
  const rnd = mulberry32(seed + 777)
  const result = []

  for (const n of nodes) {
    if (!n.terminal) continue
    if (n.depth < 6) continue

    const chanceBase = family === "small" ? 0.50 : family === "large" ? 0.72 : 0.62
    const chance = chanceBase + clamp((n.depth - 7) * 0.03, 0, 0.16)

    if (rnd() < chance) {
      const clusterCount = rnd() < 0.42 ? 2 : 1
      for (let i = 0; i < clusterCount; i++) {
        result.push({
          x: n.x + (rnd() * 2 - 1) * 6,
          y: n.y + (rnd() * 2 - 1) * 6,
          strength: 0.8 + rnd() * 0.45
        })
      }
    }
  }

  return result
}

function spaceColonizationTree(width, height, settings, family) {
  const styleCfg = STYLES[settings.style]
  const rnd = mulberry32(settings.seed)

  const skeleton = buildInitialSkeleton(width, height, styleCfg, rnd, family)
  const nodes = skeleton.nodes
  const segments = skeleton.segments
  const points = generateAttractionPoints(width, height, styleCfg, rnd, family)

  const scale = family === "large" ? 1.35 : family === "small" ? 0.85 : 1.0
  const killDistance = styleCfg.killDistance * scale
  const attractionDistance = styleCfg.attractionDistance * scale
  const segmentLength = styleCfg.segmentLength * scale
  const maxIterations = family === "small" ? 110 : family === "large" ? 210 : 150

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const influences = new Map()
    let activeTargets = 0

    for (const p of points) {
      if (!p.alive) continue

      let nearestNode = null
      let nearestDist = Infinity

      for (const n of nodes) {
        const dx = p.x - n.x
        const dy = p.y - n.y
        const d = Math.sqrt(dx * dx + dy * dy)

        if (d < killDistance) {
          p.alive = false
          nearestNode = null
          break
        }

        if (d < nearestDist && d < attractionDistance) {
          nearestDist = d
          nearestNode = n
        }
      }

      if (!p.alive) continue
      if (!nearestNode) continue

      activeTargets++
      const dx = p.x - nearestNode.x
      const dy = p.y - nearestNode.y
      const dir = normalizeVec(dx, dy)

      if (!influences.has(nearestNode.id)) {
        influences.set(nearestNode.id, { x: 0, y: 0, count: 0 })
      }

      const inf = influences.get(nearestNode.id)
      inf.x += dir.x
      inf.y += dir.y
      inf.count += 1
    }

    if (activeTargets === 0 || influences.size === 0) break

    const newNodeMap = new Map()

    for (const [nodeId, inf] of influences.entries()) {
      const base = nodes[nodeId]
      let dir = normalizeVec(inf.x, inf.y)

      const upBias = normalizeVec(0, -1)
      const lateral = normalizeVec(dir.x, 0)
      const outFactor = clamp(Math.abs(dir.x), 0, 1)

      let mixX = dir.x * 0.68 + upBias.x * 0.18 + lateral.x * 0.14 * styleCfg.lateralBias
      let mixY = dir.y * 0.68 + upBias.y * 0.18

      if (base.depth > 4) mixY += styleCfg.droopOuter * outFactor

      dir = normalizeVec(mixX, mixY)

      const nx = base.x + dir.x * segmentLength
      const ny = base.y + dir.y * segmentLength
      const key = `${Math.round(nx)}:${Math.round(ny)}`
      if (newNodeMap.has(key)) continue

      const node = {
        id: nodes.length,
        x: nx,
        y: ny,
        parent: nodeId,
        children: [],
        depth: base.depth + 1,
        vitality: clamp(base.vitality * 0.96, 0.18, 1.0),
        radius: 1,
        terminal: true,
        trunkLevel: 0
      }

      nodes.push(node)
      nodes[nodeId].children.push(node.id)
      nodes[nodeId].terminal = false
      segments.push({ a: nodeId, b: node.id, order: base.depth + 1 })
      newNodeMap.set(key, node.id)
    }
  }

  computeRadii(nodes)
  const blossoms = collectBlossomPoints(nodes, settings.seed, family)
  return { nodes, segments, blossoms }
}

function strokeLine(ctx, x1, y1, x2, y2, width, color) {
  const p = new Path()
  p.move(new Point(x1, y1))
  p.addLine(new Point(x2, y2))
  ctx.addPath(p)
  ctx.setStrokeColor(new Color(color))
  ctx.setLineWidth(width)
  ctx.strokePath()
}

function fillEllipseRect(ctx, x, y, w, h, color) {
  ctx.setFillColor(new Color(color))
  ctx.fillEllipse(new Rect(x, y, w, h))
}

function segmentAgeFactor(segmentIndex, visibleSegments, totalSegments) {
  if (visibleSegments <= 1) return 0.25

  const relativeVisibleAge = 1 - segmentIndex / Math.max(1, visibleSegments - 1)
  const globalPosition = segmentIndex / Math.max(1, totalSegments - 1)
  const olderBonus = smoothstep(0.0, 0.55, relativeVisibleAge)
  const innerBonus = 1 - smoothstep(0.35, 1.0, globalPosition)

  let age = olderBonus * 0.72 + innerBonus * 0.28
  age = clamp(age, 0, 1)
  return 0.22 + age * 0.78
}

function localThicknessFactor(segmentIndex, visibleSegments, totalSegments, stageThickness, trunkLevel) {
  const age = segmentAgeFactor(segmentIndex, visibleSegments, totalSegments)
  let matured = stageThickness * (0.40 + age * 0.60)

  if (trunkLevel >= 2) matured *= 0.78 + age * 0.42
  else if (trunkLevel === 1) matured *= 0.88 + age * 0.18
  else matured *= 0.94 + age * 0.08

  return clamp(matured, 0.14, 1.15)
}

function drawGround(ctx, settings, width, height) {
  const baseY = height - height * 0.075
  const steps = 10

  let lastX = 0
  let lastY = baseY
  for (let i = 1; i <= steps; i++) {
    const x = width * (i / steps)
    const wave = Math.sin(i * 0.9) * height * 0.008
    const y = baseY + wave
    strokeLine(ctx, lastX, lastY, x, y, Math.max(2, height * 0.005), settings.groundColor)
    lastX = x
    lastY = y
  }
}

function drawSun(ctx, settings, width, height, family) {
  if (!settings.showSun) return

  const size = family === "small" ? width * 0.14 : family === "large" ? width * 0.10 : width * 0.11
  const x = width - size - width * 0.08
  const y = height * 0.09
  fillEllipseRect(ctx, x, y, size, size, settings.sunColor)
}

function drawSegment(ctx, a, b, radius, settings, family, thicknessFactor) {
  const isTrunk = (a.trunkLevel || 0) >= 2
  let w = branchWidthFromRadius(radius, family, isTrunk)

  if (isTrunk) w *= thicknessFactor
  else w *= 0.72 + thicknessFactor * 0.28

  if (family === "small") w = Math.max(1.35, w)
  else w = Math.max(1.5, w)

  strokeLine(ctx, a.x, a.y, b.x, b.y, w, settings.branchColor)
  fillEllipseRect(ctx, a.x - w / 2, a.y - w / 2, w, w, settings.branchColor)
  fillEllipseRect(ctx, b.x - w / 2, b.y - w / 2, w, w, settings.branchColor)
}

function drawStump(ctx, tree, stageIndex, settings, family, width, height, visibleSegments, totalSegments) {
  if (visibleSegments < 1) return

  const stage = STAGES[stageIndex]
  const root = tree.nodes[0]
  const trunkThicknessMaxPhase = STAGES[2].thickness
  const isTrunkSeg = (root.trunkLevel || 0) >= 2
  const thicknessForSegment = isTrunkSeg && stageIndex >= 3 ? trunkThicknessMaxPhase : stage.thickness

  const thicknessFactor = localThicknessFactor(0, visibleSegments, totalSegments, thicknessForSegment, root.trunkLevel || 0)
  let neckW = branchWidthFromRadius(root.radius, family, true) * thicknessFactor

  if (family === "small") neckW = Math.max(1.2, neckW)
  else neckW = Math.max(1.5, neckW)

  const growthMix = clamp((stage.growth - 0.04) / 0.96, 0, 1)
  const verticalStretch = 0.26 + 0.74 * smoothstep(0, 1, growthMix)
  const groundY = height - height * 0.075
  const drop = groundY - root.y
  if (drop <= 1) return

  const stumpBottomY = root.y + drop * verticalStretch
  const flare = (2.05 + 1.35 * growthMix) * (0.86 + 0.14 * stage.thickness) * (0.9 + 0.1 * verticalStretch)
  const baseHalfW = flare * neckW * 0.5

  const rnd = mulberry32(settings.seed + 9182)
  const jagged = 5 + ((rnd() * 3) | 0)
  const ptsBot = []

  for (let i = 0; i < jagged; i++) {
    const t = i / Math.max(1, jagged - 1)
    const u = (t - 0.5) * 2
    const wobble = (rnd() - 0.5) * neckW * 0.5
    const asym = 0.88 + rnd() * 0.24
    ptsBot.push({
      x: root.x + u * baseHalfW * asym + wobble + (rnd() - 0.5) * neckW * 0.22,
      y: stumpBottomY + (rnd() - 0.5) * 1.4
    })
  }

  const tl = { x: root.x - neckW / 2, y: root.y }
  const tr = { x: root.x + neckW / 2, y: root.y }

  const p = new Path()
  p.move(new Point(ptsBot[0].x, ptsBot[0].y))
  for (let i = 1; i < ptsBot.length; i++) {
    p.addLine(new Point(ptsBot[i].x, ptsBot[i].y))
  }
  p.addLine(new Point(tr.x, tr.y))
  p.addLine(new Point(tl.x, tl.y))
  p.closeSubpath()

  ctx.addPath(p)
  ctx.setFillColor(new Color(settings.branchColor))
  ctx.fillPath()
}

function drawBud(ctx, x, y, settings, scale) {
  const r = 2.8 * scale
  fillEllipseRect(ctx, x - r, y - r, r * 2, r * 2, settings.blossomColor)
}

function drawFlower(ctx, x, y, settings, scale) {
  const petal = 7.5 * scale
  const offset = 5.4 * scale

  fillEllipseRect(ctx, x - offset, y - 3.5 * scale, petal, petal, settings.blossomColor)
  fillEllipseRect(ctx, x + 1.5 * scale, y - 3.5 * scale, petal, petal, settings.blossomColor)
  fillEllipseRect(ctx, x - 3.5 * scale, y - offset, petal, petal, settings.blossomColor)
  fillEllipseRect(ctx, x - 3.5 * scale, y + 1.5 * scale, petal, petal, settings.blossomColor)
  fillEllipseRect(ctx, x - 1.5 * scale, y - 1.5 * scale, 3 * scale, 3 * scale, settings.branchColor)
}

function drawFallenPetals(ctx, settings, seed, amount, width, height, scale) {
  const rnd = mulberry32(seed + 9999)
  for (let i = 0; i < amount; i++) {
    const x = width * 0.16 + rnd() * width * 0.62
    const y = height - height * 0.13 + rnd() * (height * 0.05)
    fillEllipseRect(ctx, x, y, 6 * scale, 4 * scale, settings.blossomColor)
  }
}

function enumerateShootSites(tree, visibleSegments, family, seed) {
  const rnd = mulberry32(seed + 4321)
  const scale = family === "small" ? 0.82 : family === "large" ? 1.18 : 1.0
  const sites = []

  for (let segIdx = 0; segIdx < visibleSegments; segIdx++) {
    const s = tree.segments[segIdx]
    const a = tree.nodes[s.a]
    const b = tree.nodes[s.b]
    if (a.trunkLevel >= 3 && b.trunkLevel >= 3) continue

    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / len
    const uy = dy / len
    const px = -uy
    const py = ux
    const depthBonus = clamp(0.78 + (b.depth || 0) * 0.032, 0.78, 1.48)
    let along = len * (0.035 + rnd() * 0.08)

    while (along < len * 0.94) {
      if (rnd() > 0.84 / depthBonus) {
        along += (5.5 + rnd() * 7) * scale
        continue
      }

      const bx = a.x + ux * along
      const by = a.y + uy * along
      const side = rnd() < 0.5 ? 1 : -1
      const shootLen = (2.8 + rnd() * 6.2) * scale
      const upMix = 0.24 + rnd() * 0.26

      let vx = side * px * (1 - upMix)
      let vy = side * py * (1 - upMix) - upMix
      const vlen = Math.sqrt(vx * vx + vy * vy) || 1
      vx /= vlen
      vy /= vlen

      sites.push({
        bx,
        by,
        ux: vx,
        uy: vy,
        shootLen,
        strength: 0.85 + rnd() * 0.35
      })

      along += ((8 + rnd() * 15) * scale) / depthBonus
    }
  }

  return sites
}

function shootFamilyScale(family) {
  return family === "small" ? 0.82 : family === "large" ? 1.18 : 1.0
}

function drawShootStemsFromSites(ctx, sites, shootProgress, settings, family) {
  const scale = shootFamilyScale(family)
  const p = clamp(shootProgress, 0, 1)
  if (p <= 0) return

  const width = Math.max(0.65, 0.95 * scale)

  for (const site of sites) {
    const mx = site.bx + site.ux * site.shootLen * p
    const my = site.by + site.uy * site.shootLen * p
    strokeLine(ctx, site.bx, site.by, mx, my, width, settings.branchColor)
  }
}

function drawShootTipBlooms(ctx, sites, shootTipStage, shootProgress, settings, family, budScale, flowerScale) {
  const p = clamp(shootProgress, 0, 1)
  if (p < 1 || shootTipStage < 1) return

  const scale = shootFamilyScale(family)
  const stg = shootTipStage

  for (const site of sites) {
    const ex = site.bx + site.ux * site.shootLen
    const ey = site.by + site.uy * site.shootLen
    const st = site.strength

    if (stg === 1) {
      const r = 1.15 * scale * st
      fillEllipseRect(ctx, ex - r, ey - r, r * 2, r * 2, settings.blossomColor)
    } else if (stg === 2) {
      drawBud(ctx, ex, ey, settings, budScale * st * 0.5)
    } else if (stg === 3) {
      drawBud(ctx, ex, ey, settings, budScale * st * 0.86)
    } else {
      drawFlower(ctx, ex, ey, settings, flowerScale * st)
    }
  }
}

function drawSceneIntrinsic(ctx, tree, stageIndex, settings, family, width, height) {
  const stage = STAGES[stageIndex]
  const totalSegments = tree.segments.length
  const visibleSegments = Math.floor(totalSegments * stage.growth)
  const trunkThicknessMaxPhase = STAGES[2].thickness

  drawSun(ctx, settings, width, height, family)
  drawGround(ctx, settings, width, height)
  drawStump(ctx, tree, stageIndex, settings, family, width, height, visibleSegments, totalSegments)

  for (let i = 0; i < visibleSegments; i++) {
    const s = tree.segments[i]
    const a = tree.nodes[s.a]
    const b = tree.nodes[s.b]
    const isTrunkSeg = (a.trunkLevel || 0) >= 2
    const thicknessForSegment = isTrunkSeg && stageIndex >= 3 ? trunkThicknessMaxPhase : stage.thickness
    const thicknessFactor = localThicknessFactor(i, visibleSegments, totalSegments, thicknessForSegment, a.trunkLevel || 0)
    drawSegment(ctx, a, b, a.radius, settings, family, thicknessFactor)
  }

  const budScale = family === "small" ? 0.72 : family === "large" ? 1.12 : 0.92
  const flowerScale = family === "small" ? 0.65 : family === "large" ? 1.12 : 0.88

  if (stage.shoots) {
    const shootSites = enumerateShootSites(tree, visibleSegments, family, settings.seed)
    const shootProgress = stage.shootProgress != null ? stage.shootProgress : 1
    const shootTipStage = stage.shootTipStage != null ? stage.shootTipStage : 0
    drawShootStemsFromSites(ctx, shootSites, shootProgress, settings, family)
    drawShootTipBlooms(ctx, shootSites, shootTipStage, shootProgress, settings, family, budScale, flowerScale)
  }

  const visibleBlossoms = tree.blossoms.filter(p => {
    let nearest = Infinity
    for (let i = 0; i < visibleSegments; i++) {
      const s = tree.segments[i]
      const b = tree.nodes[s.b]
      const dx = p.x - b.x
      const dy = p.y - b.y
      const d = dx * dx + dy * dy
      if (d < nearest) nearest = d
    }
    return nearest < 900
  })

  const suppressTerminalBloom = stage.shootProgress != null && stage.shootProgress < 1

  if (!suppressTerminalBloom && stage.maxBloom && visibleBlossoms.length) {
    const rnd = mulberry32(settings.seed + 2048 + stageIndex)
    for (let i = 0; i < visibleBlossoms.length; i++) {
      const p = visibleBlossoms[i]
      const s = flowerScale * p.strength * 1.06
      drawFlower(ctx, p.x, p.y, settings, s)
    }

    const extraBuds = Math.floor(visibleBlossoms.length * 0.48)
    for (let j = 0; j < extraBuds; j++) {
      const p = visibleBlossoms[j % visibleBlossoms.length]
      const ox = (rnd() - 0.5) * 10
      const oy = (rnd() - 0.5) * 10
      drawBud(ctx, p.x + ox, p.y + oy, settings, budScale * p.strength * 0.95)
    }
  } else if (!suppressTerminalBloom && !stage.bare) {
    const budCount = Math.floor(visibleBlossoms.length * stage.buds)
    const flowerCount = Math.floor(visibleBlossoms.length * stage.flowers)

    for (let i = 0; i < budCount; i++) {
      const p = visibleBlossoms[i]
      drawBud(ctx, p.x, p.y, settings, budScale * p.strength)
    }
    for (let i = 0; i < flowerCount; i++) {
      const p = visibleBlossoms[i]
      drawFlower(ctx, p.x, p.y, settings, flowerScale * p.strength)
    }
  }

  if (stage.petals > 0) {
    const petalAmount = family === "small" ? 8 : family === "large" ? 24 : 14
    const boost = stage.petalBoost != null ? stage.petalBoost : 1
    drawFallenPetals(ctx, settings, settings.seed + stageIndex * 31, Math.floor(petalAmount * stage.petals * boost), width, height, budScale)
  }
}

function renderScene(stageIndex, settings, family) {
  const size = familyCanvasSize(family)
  const width = size.w
  const height = size.h
  const tree = spaceColonizationTree(width, height, settings, family)

  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = true
  ctx.respectScreenScale = true

  ctx.setFillColor(new Color(settings.bgColor))
  ctx.fillRect(new Rect(0, 0, width, height))
  drawSceneIntrinsic(ctx, tree, stageIndex, settings, family, width, height)

  return ctx.getImage()
}

function stageDescription(index) {
  const st = STAGES[index]
  if (st.bare) return "Baum ohne Blueten"
  if (st.petalBoost) return "Fallende Blueten"
  if (st.maxBloom) return "Maximale Bluetenpracht"
  if (st.shootProgress != null && st.shootProgress < 1) return "Triebe wachsen"
  if (st.shoots && st.shootTipStage === 0) return "Triebe fertig"
  if (st.shootTipStage === 1) return "Punkt an Trieb"
  if (st.shootTipStage === 2) return "Kleine Knospe"
  if (st.shootTipStage === 3) return "Grosse Knospe"
  if (st.shootTipStage === 4 && st.shoots && !st.maxBloom) return "Offene Triebspitzen-Blueten"
  return "Wachstum"
}

function makeWidget(settings, family, stageIndex) {
  const widget = new ListWidget()
  widget.backgroundColor = new Color(settings.bgColor)
  widget.setPadding(0, 0, 0, 0)

  const img = renderScene(stageIndex, settings, family)

  const stack = widget.addStack()
  stack.layoutVertically()
  stack.centerAlignContent()

  const imgEl = stack.addImage(img)
  imgEl.imageSize = familyImageSize(family)
  imgEl.centerAlignImage()

  return widget
}

async function promptText(title, message, value) {
  const a = new Alert()
  a.title = title
  a.message = message
  a.addTextField("Wert", String(value))
  a.addAction("Speichern")
  a.addCancelAction("Abbrechen")
  const result = await a.presentAlert()
  if (result === -1) return null
  return a.textFieldValue(0)
}

async function chooseStyle(settings) {
  const a = new Alert()
  a.title = "Style"
  a.message = `Aktuell: ${STYLES[settings.style].label}`
  a.addAction("Natuerlich")
  a.addAction("Minimalistisch")
  a.addAction("Ornamental")
  a.addCancelAction("Zurueck")
  const result = await a.presentSheet()

  if (result === 0) settings.style = "natural"
  if (result === 1) settings.style = "minimal"
  if (result === 2) settings.style = "ornamental"
  saveSettings(settings)
}

async function choosePreviewFamily(settings) {
  const a = new Alert()
  a.title = "Vorschaugroesse"
  a.message = `Aktuell: ${settings.previewFamily}`
  a.addAction("Small")
  a.addAction("Medium")
  a.addAction("Large")
  a.addCancelAction("Zurueck")
  const result = await a.presentSheet()

  if (result === 0) settings.previewFamily = "small"
  if (result === 1) settings.previewFamily = "medium"
  if (result === 2) settings.previewFamily = "large"
  saveSettings(settings)
}

async function editColors(settings) {
  while (true) {
    const a = new Alert()
    a.title = "Farben"
    a.message =
      `Hintergrund: ${settings.bgColor}\n` +
      `Aeste: ${settings.branchColor}\n` +
      `Blueten: ${settings.blossomColor}\n` +
      `Sonne: ${settings.sunColor}\n` +
      `Boden: ${settings.groundColor}`
    a.addAction("Hintergrund")
    a.addAction("Aeste")
    a.addAction("Blueten")
    a.addAction("Sonne")
    a.addAction("Boden")
    a.addCancelAction("Zurueck")

    const result = await a.presentSheet()
    if (result === -1) break

    if (result === 0) {
      const v = await promptText("Hintergrund", "Hex wie #fcf7f8", settings.bgColor)
      if (v !== null) settings.bgColor = normalizeHex(v, settings.bgColor)
    }
    if (result === 1) {
      const v = await promptText("Aeste", "Hex wie #111111", settings.branchColor)
      if (v !== null) settings.branchColor = normalizeHex(v, settings.branchColor)
    }
    if (result === 2) {
      const v = await promptText("Blueten", "Hex wie #d98aa0", settings.blossomColor)
      if (v !== null) settings.blossomColor = normalizeHex(v, settings.blossomColor)
    }
    if (result === 3) {
      const v = await promptText("Sonne", "Hex wie #e35b5b", settings.sunColor)
      if (v !== null) settings.sunColor = normalizeHex(v, settings.sunColor)
    }
    if (result === 4) {
      const v = await promptText("Boden", "Hex wie #cbb7b1", settings.groundColor)
      if (v !== null) settings.groundColor = normalizeHex(v, settings.groundColor)
    }

    saveSettings(settings)
  }
}

async function toggleSun(settings) {
  settings.showSun = !settings.showSun
  saveSettings(settings)
}

async function newSeed(settings) {
  settings.seed = Math.floor(Math.random() * 1000000)
  saveSettings(settings)
}

async function resetSettings(settings) {
  Object.assign(settings, DEFAULT_SETTINGS)
  saveSettings(settings)
  resetPhaseIndex()
}

async function previewCurrent(settings) {
  const family = settings.previewFamily || "medium"
  const stageIndex = loadPhaseIndex()
  const widget = makeWidget(settings, family, stageIndex)

  if (family === "small") {
    await widget.presentSmall()
  } else if (family === "large") {
    await widget.presentLarge()
  } else {
    await widget.presentMedium()
  }
}

async function previewNextStep(settings) {
  const family = settings.previewFamily || "medium"
  const stageIndex = incrementPhaseIndex()
  const widget = makeWidget(settings, family, stageIndex)

  if (family === "small") {
    await widget.presentSmall()
  } else if (family === "large") {
    await widget.presentLarge()
  } else {
    await widget.presentMedium()
  }
}

async function openSettingsMenu(settings) {
  while (true) {
    const currentPhase = loadPhaseIndex()
    const a = new Alert()
    a.title = "Einstellungen"
    a.message =
      `Style: ${STYLES[settings.style].label}\n` +
      `Sonne: ${settings.showSun ? "Ja" : "Nein"}\n` +
      `Vorschau: ${settings.previewFamily}\n` +
      `Seed: ${settings.seed}\n` +
      `Phase: ${currentPhase + 1}/${STAGES.length}\n` +
      `${stageDescription(currentPhase)}`
    a.addAction("Style")
    a.addAction("Farben")
    a.addAction(settings.showSun ? "Sonne ausschalten" : "Sonne einschalten")
    a.addAction("Vorschaugroesse")
    a.addAction("Neue Baumform")
    a.addAction("Phase zuruecksetzen")
    a.addAction("Standardwerte laden")
    a.addCancelAction("Fertig")

    const result = await a.presentSheet()
    if (result === -1) break

    if (result === 0) await chooseStyle(settings)
    if (result === 1) await editColors(settings)
    if (result === 2) await toggleSun(settings)
    if (result === 3) await choosePreviewFamily(settings)
    if (result === 4) await newSeed(settings)
    if (result === 5) resetPhaseIndex()
    if (result === 6) await resetSettings(settings)
  }
}

async function mainMenu(settings) {
  while (true) {
    const currentPhase = loadPhaseIndex()
    const a = new Alert()
    a.title = "Sakura Widget"
    a.message =
      `Style: ${STYLES[settings.style].label}\n` +
      `Sonne: ${settings.showSun ? "Ja" : "Nein"}\n` +
      `Vorschau: ${settings.previewFamily}\n` +
      `Aktuelle Phase: ${currentPhase + 1}/${STAGES.length}\n` +
      `${stageDescription(currentPhase)}`
    a.addAction("Aktuelle Vorschau")
    a.addAction("Naechsten Wachstumsschritt zeigen")
    a.addAction("Einstellungen")
    a.addCancelAction("Beenden")

    const result = await a.presentSheet()
    if (result === -1) return
    if (result === 0) await previewCurrent(settings)
    if (result === 1) await previewNextStep(settings)
    if (result === 2) await openSettingsMenu(settings)
  }
}

async function main() {
  const settings = loadSettings()

  if (config.runsInWidget) {
    const family = config.widgetFamily || settings.previewFamily || "medium"
    const stageIndex = incrementPhaseIndex()
    const widget = makeWidget(settings, family, stageIndex)

    widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

    Script.setWidget(widget)
    Script.complete()
    return
  }

  await mainMenu(settings)
}

await main()
