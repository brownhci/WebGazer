module.exports = {
    name:    'IfStatement',
    maxTime: 2,
    async:   true,
    tests:   [
        {
            name: 'Conditional evaluation for "Array Has Length"',
            fn: function() {
                var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                if ( array.length > 0 ){
                    //code
                }
            }
        },
        {
            name: 'Truthy evaluation for "Array Has Length"',
            fn: function(){
                var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                if ( array.length ) {
                    //code
                }
            }
        },
        {
            name: 'Conditional evaluation for "Array Has No Length"',
            fn: function(){
                var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                if ( array.length === 0 ) {
                    //code
                }
            }
        },
        {
            name: 'Truthy evaluation "Array Has No Length"',
            fn: function(){
                var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                if ( !array.length ) {
                    //code
                }
            }
        }
    ]
};
