var store_points_var = false;
var xPast50 = new Array(50);
var yPast50 = new Array(50);

/**
* This makes the variable store_points true, so all the occuring prediction
* points are stored
*/
function store_points_variable(){
  store_points_var = true;
}

/**
* This makes the variable store_points false, so points aren't stored any more
* and returns the arrays containing the points
*/
function stop_storing_points_variable(){
  store_points_var = false;
}

/*
 * This stores the position of the past fifty occuring tracker preditions
 */
function store_points(x, y, k) {
  xPast50[k] = x;
  yPast50[k] = y;
}

/*
 * This returns the stored points
 */
function return_points() {
  var past50 = new Array(2);
  past50[0] = xPast50;
  past50[1] = yPast50;
  return past50;
}
