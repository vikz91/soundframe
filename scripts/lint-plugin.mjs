const globalObjects = new Set(['window', 'globalThis', 'document', 'self'])
const absoluteUrl = /^(?:[a-z][\d+.a-z-]*:|\/\/)/i

function hasProperty(node, name) {
  return (
    node?.type === 'MemberExpression' &&
    (node.computed ? node.property.type === 'Literal' && node.property.value === name : node.property.name === name)
  )
}

function findVariable(sourceCode, node) {
  for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)
    if (variable) return variable
  }
  return null
}

function isGlobalLocation(sourceCode, node) {
  const root =
    node?.type === 'Identifier' && node.name === 'location'
      ? node
      : hasProperty(node, 'location') && node.object.type === 'Identifier' && globalObjects.has(node.object.name)
        ? node.object
        : null
  return root !== null && findVariable(sourceCode, root)?.defs.length === 0
}

// Resolve known URL prefixes without evaluating code. Unknown and cyclic values are skipped.
function stringPrefix(sourceCode, node, seen = new Set()) {
  if (!node || seen.has(node)) return null
  seen.add(node)
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null
  if (node.type === 'TemplateLiteral') {
    const prefix = node.quasis[0].value.cooked ?? node.quasis[0].value.raw
    return prefix || (node.expressions.length === 0 ? '' : null)
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = stringPrefix(sourceCode, node.left, new Set(seen))
    if (left === null) return null
    return left + (stringPrefix(sourceCode, node.right, new Set(seen)) ?? '')
  }
  if (node.type !== 'Identifier') return null
  const variable = findVariable(sourceCode, node)
  const definition = variable?.defs.at(-1)
  if (definition?.type !== 'Variable') return null
  let value = definition.node.init
  for (const reference of variable.references) {
    if (reference.identifier.range[0] >= node.range[0]) break
    if (reference.isWrite() && reference.writeExpr) value = reference.writeExpr
  }
  return stringPrefix(sourceCode, value, seen)
}

const navigationRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      useRouter: 'Use Next.js redirect() or useRouter().push() to navigate to internal pages.'
    }
  },
  create(context) {
    const { sourceCode } = context
    function check(node, location, destination) {
      if (!isGlobalLocation(sourceCode, location)) return
      const prefix = stringPrefix(sourceCode, destination)
      if (prefix !== null && !absoluteUrl.test(prefix)) context.report({ node, messageId: 'useRouter' })
    }
    return {
      CallExpression(node) {
        if (hasProperty(node.callee, 'assign')) check(node, node.callee.object, node.arguments[0])
      },
      AssignmentExpression(node) {
        if (hasProperty(node.left, 'href')) check(node, node.left.object, node.right)
      }
    }
  }
}

const plugin = {
  meta: { name: 'audioframe' },
  rules: { 'no-location-assign-relative-destination': navigationRule }
}

export default plugin
