(function () {
    'use strict';

    function dashboardController(
        $scope,
        translateSetService) {
        var vm = this;
        vm.setup = true; 

        getSets();

        //////////////////

        function getSets() {
            translateSetService.list()
                .then(function (results) {
                    if (results.data.length == 0) {
                        vm.setup = false;
                    }
                }, function(error) {
                    // doh!
                });
        }
    }

    angular.module('umbraco')
        .controller('translatePlusDashboard.controller', dashboardController);

})();