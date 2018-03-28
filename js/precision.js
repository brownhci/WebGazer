/*
 * Initialises variables used to store accuracy eigenValues
 * This is used by the calibration example file
 */
var store_points_var = false;
var xPast50 = new Array(50);
var yPast50 = new Array(50);

/*
 * Stores the position of the fifty most recent tracker preditions
 */
function store_points(x, y, k) {
  xPast50[k] = x;
  yPast50[k] = y;
}
