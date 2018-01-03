var store_points_var = false;
var xPast50 = new Array(50);
var yPast50 = new Array(50);

/*
 * Sets store_points to true, so all the occuring prediction
 * points are stored
 */
function store_points_variable(){
  store_points_var = true;
}

/*
 * Sets store_points to false, so prediction points aren't 
 * stored any more
 */
function stop_storing_points_variable(){
  store_points_var = false;
}

/*
 * Stores the position of the fifty most recent tracker preditions
 */
function store_points(x, y, k) {
  xPast50[k] = x;
  yPast50[k] = y;
}

/*
 * Returns the stored tracker prediction points
 */
function get_points() {
  var past50 = new Array(2);
  past50[0] = xPast50;
  past50[1] = yPast50;
  return past50;
}
