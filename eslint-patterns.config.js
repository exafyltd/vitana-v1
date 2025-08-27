// ESLint rules for pattern enforcement
// Add to main eslint.config.js

const communityHeaderPatternRule = {
  "community-header-pattern": {
    meta: {
      type: "problem",
      docs: {
        description: "Enforce 3-card Community header pattern",
        category: "Best Practices"
      },
      fixable: null,
      schema: []
    },
    create(context) {
      return {
        JSXElement(node) {
          // Check if this is a Community page component
          const filename = context.getFilename();
          if (!filename.includes('/pages/community/') || filename.includes('Community.tsx')) {
            return;
          }

          // Look for single card headers (anti-pattern)
          if (node.openingElement.name.name === 'div' && 
              node.openingElement.attributes.some(attr => 
                attr.name && attr.name.name === 'className' && 
                attr.value.value && 
                attr.value.value.includes('bg-white/80') && 
                !context.getSourceCode().getText().includes('flex-1')
              )) {
            context.report({
              node,
              message: "Community pages must use the 3-card header pattern. See docs/UI_PATTERNS.md"
            });
          }
        }
      };
    }
  }
};

module.exports = { communityHeaderPatternRule };