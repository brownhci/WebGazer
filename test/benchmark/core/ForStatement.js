
const ARRAY_SIZE = 10000000;
var testArray = new Array(ARRAY_SIZE);
for(var i = 0 ; i < ARRAY_SIZE ; ++i) {
    testArray[i] = i;
}

module.exports = {
    name:    'ForStatement',
    maxTime: 2,
    async:   false,
    minSamples: 10,
    tests:   [
//        {
//            name: 'Internal declaration with post-incrementation',
//            fn: function() {
//
//                for(var i = 0, l = 10 ; i < l ; i++){
//                    // code
//                }
//
//            }
//        },
//        {
//            name: 'Internal declaration with ante-incrementation',
//            fn: function() {
//
//                for(var i = 0, l = 10 ; i < l ; ++i){
//                    //code
//                }
//
//            }
//        },
//        {
//            name: 'External declaration',
//            fn: function() {
//
//                var i, l;
//
//                for(i = 0, l = 10 ; i < l ; ++i){
//                    //code
//                }
//
//            }
//        },
//        {
//            name: 'External assignment',
//            fn: function() {
//
//                var i = 0,
//                    l = 10;
//
//                for( ; i < l ; ++i){
//                    //code
//                }
//
//            }
//        },
//        {
//            name: 'External assignment with inner ante-incremental',
//            fn: function() {
//
//                var i = 0,
//                    l = 10;
//
//                for( ; i < l ; ){
//                    ++i;
//                }
//
//            }
//        },
        {
            name: 'Loop with array length access',
            fn: function() {

                for(var i = 0 ; i < testArray.length ; i++){
                    //code
                }

            }
        },
        {
            name: 'Loop with external assignment of array length',
            fn: function() {

                var i = 0;
                var l = testArray.length;

                for( ; i < l ; ++i){
                    //code
                }

            }
        }

    ]
};
