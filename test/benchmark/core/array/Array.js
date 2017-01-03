module.exports = {
    name:    'ReturnStatement',
    maxTime: 2,
    async:   true,
    tests:   [
        {
            name: 'Create empty literal array',
            fn: function(){
                var array = [];
            }
        },
        {
            name: 'Create empty new array',
            fn: function(){
                var array = new Array();
            }
        },
        {
            name: 'Create filled literal array',
            fn: function(){
                var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            }
        },
        {
            name: 'Create filled new array',
            fn: function(){
                var i = 1,
                    j = 10,
                    array = new Array(j)

                for( ; i < j ; ) {
                    array[i] = ++i;
                }
            }
        },
        // {
        //     name: 'Conditional evaluation for "Array Has No Length"',
        //     fn: function(){
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        //         return ( array.length === 0 );
        //     }
        // },
        // {
        //     name: 'Truthy evaluation "Array Has No Length"',
        //     fn: function(){
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        //         return ( !array.length );
        //     }
        // },
        // {
        //     name: 'Conditional evaluation for "Array Has Length"',
        //     fn: function() {
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        //         return ( array.length > 0 );
        //     }
        // },
        // {
        //     name: 'Truthy evaluation for "Array Has Length"',
        //     fn: function(){
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        //         return ( array.length );
        //     }
        // },
        // {
        //     name: 'Early Return (true)',
        //     fn: function(){
        //
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        //
        //         if ( array.length ){
        //             return true;
        //         }
        //         return false;
        //
        //     }
        // },
        // {
        //     name: 'Early Return (false)',
        //     fn: function(){
        //
        //         var array = [];
        //
        //         if ( array.length ){
        //             return true;
        //         }
        //         return false;
        //
        //     }
        // },
        // {
        //     name: 'Unique Return (true)',
        //     fn: function(){
        //
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        //             result = undefined;
        //
        //         if ( array.length ){
        //             result = true;
        //         } else {
        //             result = false;
        //         }
        //
        //         return result;
        //
        //     }
        // },
        // {
        //     name: 'Unique Return (false)',
        //     fn: function(){
        //
        //         var array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        //             result = undefined;
        //
        //         if ( array.length ){
        //             result = true;
        //         } else {
        //             result = false;
        //         }
        //
        //         return result;
        //
        //     }
        // }
    ]
};
