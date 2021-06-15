import mathjs from 'mathjs';

// The global mathjs configuration is read-only,
// so we create a new instance and set matrix outputs to arrays
// @see: https://mathjs.org/docs/core/configuration.html
export default mathjs.create(mathjs.all, {
  matrix: 'Array',
});
