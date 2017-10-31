/**
 * @ngdoc controller
 * @name translate.nodes.sendController
 * @function
 *
 * @description
 * Controller for the Send to translation dialog
 */

(function () {
    'use strict';

    function nodeSendController(
        $scope,
        $routeParams,
        notificationsService,
        navigationService,
        dialogService,
        translateNodeService,
        translateSetService,
        translateJobService,
        translateHub) {

        var vm = this;

        vm.busy = true;
        vm.busyMsg = "processing";

        vm.error = false; 
        vm.success = false; 
        vm.nodecheck = false;

        vm.sendtoview = true;

        // steps 'pick', 'targets', 'job', 'done'
        vm.step = 'pick';

        vm.sentview = "Sent";

        vm.nodeItems = [];

        vm.check = check;
        vm.loadSet = loadSet;
        vm.createNodes = createNodes;
        vm.createJobs = createJobs;

        vm.autoSend = false; 

        vm.navigateToJob = navigateToJob;


        vm.msgHub = translateHub.connect("TranslatePlusHub");
        if (vm.msgHub != null) {
            vm.msgHub.on('Add', function (data) {
                vm.update = data
            });
            vm.msgHub.start();
        }

        vm.job = {
            Name: "Translations $language$ " + new Date().toLocaleString(),
            TargetCulture: {},
            ProviderProperties: {},
            Provider: null,
            Status: 'Pending'
        };

        vm.createOptions = {
            singleProvider: false,
            key: ""
        };

        vm.node = $scope.dialogOptions.currentNode;
        vm.sets = [];

        vm.options = {
            children: true,
            unpublished: true,
            sites: []
        };

        // init       
        vm.loadSet(vm.node.id)
        ///////////////////

        function check() {
            vm.busy = true;

            var sites = getSelectedSites(vm.sets);
            
            translateSetService.getTargets(vm.node.id, sites)
                .then(function (result) {
                    vm.warning = false;
                    vm.mismatch = false;

                    vm.targets = result.data;

                    checkSiteTargets(vm.sets);

                    if (vm.mismatch || vm.warning) {
                        // there are some missing nodes
                        // so we tell the user
                        vm.step = 'targets';
                        vm.busy = false; 
                    }
                    else {
                        if (vm.userAutoSend)
                        {
                            // create the nodes and job 
                            // user will see the create job dialog

                            // add some nodes so the job view can tell what we are doing
                            vm.nodeItems.push({ MasterNodeName: vm.node.name });
                            if (vm.options.children) {
                                vm.nodeItems.push({ MasterNodeName: "+childpages" });
                            }
                            vm.step = 'job';
                            vm.busy = false; 
                        }
                        else {
                            // just push the nodes 
                            vm.createNodes();
                        }
                    }
                }, function (error) {
                    notificationsService.error("error", error.data.ExceptionMessage);
                });
        }

        function getTarget(id) {

            var result = 0;

            vm.targets.map(function (target) {
                if (target.SiteId == id) {
                    result = target;
                }
            });

            return result;
        }

        function createNodes () {

            vm.busy = true;
            vm.update = "Extracting translation content";

            vm.options.sites = [];

            vm.sets.forEach(function (set) {
                set.Sites.forEach(function (site) {
                    if (site.checked === true) {
                        vm.options.sites.push(site.Id);
                    }
                })
            });

            translateNodeService.create(vm.node.id, vm.options)
                .then(function (result) {
                    vm.step = 'done';
                    vm.nodes = result.data;
                    if (vm.userAutoSend) {
                        createJobs(vm.nodes);
                    }
                    else {
                        vm.busy = false;
                    }
                }, function (error) {
                    vm.error = {
                        errorMsg: "Failed",
                        data: error.data
                    };
                    vm.busy = false;
                });
        }

        // create the translations job
        function createJobs(nodes) {

            vm.busy = true;
            vm.update = "Submitting Translations";

            // group the nodes
            vm.nodeGroups = groupNodes(vm.nodes);

            vm.jobs = [];

            // we submit a job for each of the node groups we have. 
            vm.nodeGroups.forEach(function (group) {

                group.status = 'submitted';

                translateJobService.create(group.jobName, group.nodes, vm.job.provider.Key, vm.job.ProviderProperties)
                    .then(function (result) {
                        vm.busy = false;
                        vm.jobs.push(result.data);
                        group.status = 'complete';
                    }, function (error) {
                        vm.error = {
                            errorMsg: "Failed",
                            data: error.data
                        };
                        group.status = 'failed';
                    });

                vm.busy = false;
            });
        }

        function loadSet (id) {
            translateSetService.getByNode(id)
                .then(function (result) {
                    vm.sets = result.data;
                    vm.busy = false;
                }, function (error) {
                    notificationsService
                        .error("load", "can't find the set for this node");
                });
        }

        /////////////////
        $scope.$watch('vm.options.children', function (newValue, oldValue) {
            if (newValue == false) {
                vm.options.unpublished = false;
            }
        });


        /////////////////

        // groups the nodes, by culture
        function groupNodes(nodes) {
            var nodeGroups = [];

            nodes.map(function (node) {
                var found = false
                nodeGroups.map(function (group) {
                    if (group.id == node.Culture.LCID) {
                        group.nodes.push(node);
                        found = true;
                    }
                });
                if (!found) {
                    var newGroup = {
                        id: node.Culture.LCID,
                        name: node.Culture.DisplayName,
                        nodes: [],
                        status: 'pending',
                        jobName: vm.job.Name.replace("$language$", node.Culture.DisplayName)
                    };
                    newGroup.nodes.push(node);
                    nodeGroups.push(newGroup);
                }
            });

            return nodeGroups;
        }

        function getAutoSendSettings(sets) {

            var selectedSets = [];
            var singleSet = {};

            sets.forEach(function (set) {
                set.Sites.forEach(function (site) {
                    if (site.checked === true) {
                        if (selectedSets.indexOf(set.Id) == -1) {
                            selectedSets.push(set.Id);
                            singleSet = set;
                        }
                    }
                })
            });

            // we can't autosend when there is more than one set.
            if (selectedSets.length > 1) {
                vm.autoSend = false;
            }
            else {
                // this will come from the set. 
                vm.autoSend = singleSet.AutoSend;
                vm.createOptions.singleProvider =
                    singleSet.ProviderKey != "00000000-0000-0000-0000-000000000000";
                vm.createOptions.key = singleSet.ProviderKey;
            }

            vm.userAutoSend = vm.autoSend;
        }

        function getSelectedSites(sets) {
            var sites = [];

            sets.forEach(function (set) {
                set.Sites.forEach(function (site) {
                    if (site.checked === true) {
                        sites.push(site.id);
                    }
                });
            });

            return sites;
        }

        function checkSiteTargets(sets) {
            vm.sets.forEach(function (set) {
                set.Sites.forEach(function (site) {
                    if (site.checked === true) {
                        site.target = getTarget(site.Id);
                        if (site.target.TargetId === 0) {
                            vm.warning = true;
                            if (site.target.ParentId === 0) {
                                vm.mismatch = true;
                            }
                        }
                    }
                });
            })
        }

        function navigateToJob(jobId) {
            navigationService.hideDialog();
            window.location.href = "#/translatePlus/tp/job/" + jobId;
        }

        $scope.$watch("vm.sets", function (newValue, oldValue) {

            if (newValue != undefined && vm.userAutoSend == undefined) {
                getAutoSendSettings(newValue);
            }

        }, true);
    }

    angular.module("umbraco")
        .controller("translate.sendController", nodeSendController);

})();

