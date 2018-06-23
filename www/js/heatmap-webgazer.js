    // create a heatmap instance
    var heatmap = h337.create({
      container: document.getElementById('heatmapContainer'),
      // check heatmap documentation for information about configuration
      maxOpacity: .6,
      radius: 20,
      blur: .90,
    });

    var initial_delay = 1500; // visualization delay after the window has loaded (milliseconds)
    var heatmap_display_delay = 25; // sets a 25 millisecond delay before each new point is displayed
    var heatmap_data_counter = 0; // keeps track of the number of data points that have been displayed
    var heatmap_data_length = heatmap_data.data.length; // keeps track of the total number of points to be displayed

    var heatmap_timer;
    var heatmap_displayed_data = {data:[]}; // starts off empty but clones the data to display point by point

    var repeat = true; // Whether to repeat the simulation in a continous loop

    // function that initializes the visulaization by repeatedly calling heatmap_display_function()
    function heatmap_trigger_display() { 
    
        heatmap_timer = setInterval(heatmap_display_function, heatmap_display_delay); // sets the interval timer to whatever the user specified above ie. heatmap_display_delay
        heatmap_data_counter++;
   }

    function heatmap_display_function() {

        console.log("Starting Simulation");
        if(heatmap_data_counter == heatmap_data_length) {

            if(repeat){

                console.log("Reset Simulation");
                var empty_data = {
                    data : {}
                };
                heatmap.setData(empty_data);
                heatmap_displayed_data = {data:[]};
                heatmap_data_counter = 0;
            } else {
                clearInterval(heatmap_timer);
            }

        }

        heatmap_displayed_data.data.push(heatmap_data.data[heatmap_data_counter]);
        heatmap.setData(heatmap_displayed_data); // renders the data on the screen
        heatmap_data_counter++;
    }

    setTimeout(function () {heatmap_trigger_display();}, initial_delay); // starts displaying the points after the inital delay time has run out