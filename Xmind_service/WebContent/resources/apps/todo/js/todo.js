define(function(require,exports,module){
	require('bootstrapjs');
	require('commonjs');
	require('uijs');
	require('../css_img/todo.css');
	
	angular
		.module("app-todo",["utils","common","ui"])
		//过滤器
		.filter('status',function(){
			return function(array,status){
				if(!array || !array.length)return;
				var filtered = [];
				for(var i=0,len=array.length;i<len;i++){
					if(array[i].status==status)
						filtered.push(array[i]);
				}
				return filtered;
			};
		})
		.controller("todoList",["$scope","$element","xajax","prompt",function($scope,$element,xajax,prompt){
			var URL = {
					SAVE_TODO:"note/save",
					GET_LIST:"note/getNotes",
					GET_DETAIL:"note/getNotesHistory",
					DELETE_TODO:"note/delete",
					SAVE_TAG:"tag/save",
					GET_TAGS:"tag/query",
					SAVE_RELATION:"tag/saveRelation",
					DELETE_RELATION:"tag/deleteRelation"
				},
				todoPanel = angular.element(".todo-panel");
			
			//初始化todo列表
			xajax({url:URL.GET_LIST,method:"post",data:{}})
			.success(function(d){
				var list = [{text:"待处理",status:1,list:[],expand:true},
				            {text:"记事",list:[],expand:true},
				            {text:"已完成",status:2,list:[],expand:true},
				            {text:"已关闭",status:3,list:[],expand:true}];
				
				angular.forEach(d.noteList,function(v,k){
					v.old = v.content;
					list[v.status == 1 ? 0 : (v.status||1)].list.push(v);
				});
				$scope.todos = list;
			});
			
			//初始化标签
			xajax({url:URL.GET_TAGS,method:"post",data:{}})
			.success(function(d){
				$scope.tags = d.list;
				angular.forEach($scope.tags,function(v,k){
					$scope.tagsMap[k] = v.tagColor;
				});
			});
			
			$scope.todos = [];
			$scope.historyGroup = [];
			$scope.historySpan = "";
			$scope.todo = {};
			$scope.tags = [];
			$scope.tagsMap = {};
			$scope.reminderTime = "";
			
			//添加
			$scope.addTodo = function(){
				var data = {content:$scope.content};
				saveTodo(data);
			};
			
			function saveTodo(data){
				if(!data.content){
					prompt({
						type:"warning",
						content:"请填写添加内容"
					});
					return;
				}
				
				if($scope.reminderTime){
					data.status = 1;
					data.reminderTime = $scope.reminderTime; 
				}
				
				xajax({url:URL.SAVE_TODO,data:data,method:"post"})
				.success(function(d){
					var group = $scope.todos[d.status == 1 ? 0 : 1];
					
					if(!group.expand) group.expand = true;
					group.list.unshift(d);
					$scope.content = "";
					if($scope.reminderTime)
						$scope.reminderTime = "";
				});
			}
			
			//关闭
			$scope.removeTodo = function($index){
				$scope.todos.splice($index,1);
			};
			
			//回车添加
			$scope.todoKeyDown = function($event){
				if($event.keyCode === 13){
					$scope.addTodo();
				}
			};
			
			//查看历史
			$scope.viewDetail = function(todo){
				var data = {notesId:todo.notesId};
				xajax({url:URL.GET_DETAIL,data:data,method:"post"})
				.success(function(d){
					var historyGroup = [],
						last = "";
					
					$scope.historySpan = Math.floor(((new Date).getTime()-(new Date(d.noteHistoryList[0].modifyTime)).getTime())/(3600*1000*24));
					$scope.historySpan = $scope.historySpan ? $scope.historySpan+"天前":"今天";
					
					//整合历史数据
					angular.forEach(d.noteHistoryList.reverse(),function(v,k){
						v.changeContent = " ";
						if(last && last.content !== v.content){
							v.changeContent += "您将内容更新为："+v.content;
						}else if(last.status !== v.status){
							if(v.status == 1){
								if(!last){
									v.changeContent += "您新增事项："+v.content;
									v.changeContent += "并设置提醒时间为："+v.reminderTime;
								}else{
									v.changeContent += "您将事项提醒时间更改为："+v.reminderTime;
								}
							}else if(v.status == 2){
								v.changeContent += "您将事项标记为：完成";
							}else if(v.status == 3){
								v.changeContent += "您将事项标记为：关闭";
							}else{
								v.changeContent += "您新增事项："+v.content;
							}
						}
						
						var timeArray = v.modifyTime.split(" ");
						v.time = timeArray[1];
						v.date = timeArray[0];
						if(v.date === last.date){
							historyGroup[0].historyTodos.unshift(v);
						}else{
							historyGroup.unshift({time:v.date,historyTodos:[v]});
						}
						last = v;
					});
					
					$scope.historyGroup = historyGroup;
					$("#todo-history").modal("show");
				});
			};
			
			//编辑内容
			$scope.editTodo = function(todo){
				todo.editing = true;
			};
			
			//结束编辑
			$scope.endEdit = function($event,todo,key,value,group){
				var data = {notesId:todo.notesId};
				
				data.content = todo.content;
				data.reminderTime = todo.reminderTime;
				data.status = todo.status;
				if(key){
					data[key] = value;
				}else{
					if(!data.content)
						return;
					if(todo.content === todo.old){
						prompt({
							type:"warning",
							content:"未做任何修改"
						});
						todo.editing = false;
						return;
					}else{
						todo.old = todo.content;
					}
				}
				
				if(key === "reminderTime" && !data.status){
					data.status = 1;
				}
				
				xajax({url:URL.SAVE_TODO,data:data,method:"post"})
				.success(function(d){
					if(!key){
						//修改内容
						todo.editing = false;
					}else{
						//修改状态，或提醒时间
						todo[key] = value;
					}
				});
			};
			
			//回车结束编辑
			$scope.editKeyDown = function($event,todo){
				if($event.keyCode === 13){
					$scope.endEdit($event,todo);
				}
			};
			
			//删除todo
			$scope.deleteTodo = function(notesId){
				var data = {},
					i;
				angular.forEach($scope.todos,function(v,k){
					if(v.notesId == notesId){
						data.notesId = notesId;
						i = k;
						return false;
					}
				});
				
				xajax({url:URL.DELETE_TODO,data:data,method:"post"})
				.success(function(d){
					$scope.todos.splice(i,1);
				});
			};
			
			//鼠标移入
			$scope.enterTodo = function($event,todo){
				var target = angular.element($event.target).closest("li");
				
				target.addClass("active");
				$scope.todo = todo;
				target.append(todoPanel);
			};
			
			//鼠标移出
			$scope.leaveTodo = function($event){
				var target = angular.element($event.target);
				
				target.removeClass("active");
			};
			
			//打开时间选择器
			$scope.openTimepicker = function(){
				$("#time-picker").modal("show");
			};
			
			//选择时间
			$scope.addReminder = function(){
				
			};
			
			//添加标签
			$scope.addTag = function(){
				var data = {tagName:$scope.tagName};
				data.tagColor = "rgb("+[random(),random(),random()].join(",")+")";
				xajax({url:URL.SAVE_TAG,data:data,method:"post"})
				.success(function(d){
					($scope.tags || ($scope.tags=[])).unshift(data);
					$scope.tagName = "";
				});
			};
			
			$scope.tagKeyDown = function($event){
				if($event.keyCode === 13)
					$scope.addTag();
			};
			
			//标签与todo关联/取消关联
			$scope.toggleTagToTodo = function(todo,tag){
				var data = {notesId:todo.notesId},
					i = $scope.inTags(todo.tags,tag.tagName),
					tagColor = tag.tagColor,
					type = i>-1 ? "d":"s",
					url = type === "d" ? URL.DELETE_RELATION : URL.SAVE_RELATION;
				
				if(type === "d"){
					//删除tag
					data.tagId = tag.tagId;
				}else{
					//添加tag
					data.tagName = tag.tagName;
				}
				
				xajax({url:url,data:data,method:"post"})
				.success(function(d){
					if(type === "d"){
						todo.tags.splice(i,1);
					}else{
						d.tagColor = tagColor;
						todo.tags.push(d);
					}
				});
			};
			
			$scope.inTags = function(tags,tagName){
				var i = -1;
				angular.forEach(tags,function(v,k){
					if(v.tagName === tagName){
						i = k;
						return false;
					}
				});
				return i;
			};
			
			function random(){
				return Math.ceil(Math.random()*255);
			};
		}]);
	
	angular.bootstrap(document,["app-todo"]);
});
