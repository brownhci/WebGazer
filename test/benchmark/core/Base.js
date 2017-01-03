module.exports = {
    name:    'BasicTest',
    maxTime: 2,
    async:   true,
    tests:   [
        {
            name: 'Nothing',
            fn:   function () {
                //nothing...
            }
        }, 
        {
            name: 'Return immediately (synchronous)',
            fn:   function () {
                return;
            }
        },
        {
            name: 'Ante-incrementation',
            fn:   function () {
                var i;
                ++i;
            }
        },
        {
            name: 'post-incrementation',
            fn:   function () {
                var i;
                i++;
            }
        },
        // {
        //     name: 'Throw immediately (synchronous)',
        //     fn:   function () {
        //         // throw Error("Damned");
        //     }
        // },
        {
            name:  'Timeout 0ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 0);
            }
        },
        {
            name:  'Timeout 1ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 1);
            }
        },
        {
            name:  'Timeout 10ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 10);
            }
        },
        {
            name:  'Timeout 25ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 25);
            }
        },
        {
            name:  'Timeout 50ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 50);
            }
        },
        {
            name:  'Timeout 100ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 100);
            }
        },
        {
            name:  'Timeout 1000ms (asynchronous)',
            defer: true,
            fn:    function (deferred) {
                setTimeout(function () {
                    deferred.resolve();
                }, 1000);
            }
        }
    ]
};
