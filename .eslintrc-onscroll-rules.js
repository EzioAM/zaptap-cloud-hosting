/**
 * Additional ESLint rules to prevent onScroll type mismatches
 * Add these rules to your main .eslintrc.js file
 */

module.exports = {
  rules: {
    // Prevent Animated.event objects being assigned to onScroll
    'no-animated-event-onscroll': {
      create(context) {
        return {
          JSXAttribute(node) {
            if (
              node.name && 
              node.name.name === 'onScroll' &&
              node.value &&
              node.value.type === 'JSXExpressionContainer'
            ) {
              const expression = node.value.expression;
              
              // Check for conditional expressions that return Animated.event
              if (expression.type === 'ConditionalExpression') {
                const { consequent, alternate } = expression;
                
                // Check if either branch returns Animated.event
                const checkForAnimatedEvent = (expr) => {
                  return (
                    expr.type === 'CallExpression' &&
                    expr.callee &&
                    expr.callee.type === 'MemberExpression' &&
                    expr.callee.object &&
                    expr.callee.object.name === 'Animated' &&
                    expr.callee.property &&
                    expr.callee.property.name === 'event'
                  );
                };
                
                if (checkForAnimatedEvent(consequent) || checkForAnimatedEvent(alternate)) {
                  context.report({
                    node,
                    message: 'onScroll should not receive Animated.event objects directly. Use a function wrapper instead.'
                  });
                }
              }
              
              // Check for direct Animated.event assignment
              if (
                expression.type === 'CallExpression' &&
                expression.callee &&
                expression.callee.type === 'MemberExpression' &&
                expression.callee.object &&
                expression.callee.object.name === 'Animated' &&
                expression.callee.property &&
                expression.callee.property.name === 'event'
              ) {
                context.report({
                  node,
                  message: 'onScroll should not receive Animated.event objects directly. Use a function wrapper instead.'
                });
              }
            }
          }
        };
      }
    },

    // Prevent handleScroll variables being assigned Animated.event conditionally
    'no-conditional-animated-event': {
      create(context) {
        return {
          VariableDeclarator(node) {
            if (
              node.id &&
              node.id.name &&
              node.id.name.includes('handleScroll') &&
              node.init &&
              node.init.type === 'ConditionalExpression'
            ) {
              const { consequent, alternate } = node.init;
              
              const checkForAnimatedEvent = (expr) => {
                return (
                  expr &&
                  expr.type === 'CallExpression' &&
                  expr.callee &&
                  expr.callee.type === 'MemberExpression' &&
                  expr.callee.object &&
                  expr.callee.object.name === 'Animated' &&
                  expr.callee.property &&
                  expr.callee.property.name === 'event'
                );
              };
              
              if (checkForAnimatedEvent(consequent) || checkForAnimatedEvent(alternate)) {
                context.report({
                  node,
                  message: 'handleScroll should not conditionally return Animated.event. Use a function wrapper instead.'
                });
              }
            }
          }
        };
      }
    }
  }
};