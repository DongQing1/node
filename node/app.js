var express=require("express");
var app=express();
var http=require("http");
var server=http.Server(app);
var body=require("body-parser");
var formidable=require("formidable");
var session=require("express-session");
var fs=require("fs");
var io=require("socket.io")(server);
var path=require("path");
var gm=require("gm");
var mongo=require("mongodb");
var mongoClient=mongo.MongoClient;
var collection_name = "students";
var connect_str="mongodb://localhost:27017/liaotianshi";
app.use(session({
	secret:"fjkafkadjfkj",
	resave:false,
	saveUninitialized:true
}))
app.use(body.urlencoded({extended:false}));
app.use(express.static("./static"));
// app.use(express.static("./uploads"));
app.get("/login",function(req,res){
	res.render("./login.ejs",{
		gongneng:"登录",
		url:"/login"
	})
})
app.get("/regist",function(req,res){
	res.render("./login.ejs",{
		gongneng:"注册",
		url:"/regist"
	})
})
app.get("/uploads/:aaa",function(req,res){
	console.log(req.url);
	res.sendFile(__dirname+req.url);
})
//登录路由
app.post("/login",function(req,res){
	var username=req.body.username;
	var password=req.body.password;
	//连接数据库
	mongoClient.connect(connect_str,function(err,db){
		if(err){
			res.send("连接数据库失败");
			return;
		}
		var obj={
			username:username,
			password:password
		}
		//查询数据库
		db.collection(collection_name).findOne(obj,function(err,data){
			if(err){
				res.send("查询数据库失败");
				db.close();
				return;
			}
			//判断是否为空,如果为空跳转到当前页面
			//如果有内容，跳转到/main.html路由
			if(data===null){
				console.log(1)
				res.redirect("/login");
			}else{				
				req.session.username=username;
				req.session.head_pic = data.head_pic;
				req.session.quanxian=data.quanxian;
				res.redirect("/main.html");
			}
		})
	})
})
//注册路由
app.post("/regist",function(req,res){
  // 第一步获取前端提交过来的数据
  var formid = new formidable.IncomingForm();
  formid.uploadDir  = "./uploads";
  formid.parse(req,function(err,fields,files){
    if(err){
      res.send("抱歉，解析上传数据失败");
      return;
    }
    // 得到上传的数据
    var username = fields.username;
    var password = fields.password; 
    var newPath =  "./uploads/"+username+path.parse(files.head_pic.name).ext;
    fs.rename(files.head_pic.path,newPath,function(err){
      if(err){
        res.send("头像文件改名失败");
        return;
      }
      // 往数据库中插入数据
      mongoClient.connect(connect_str,function(err,db){
        if(err){
          res.send("连接数据库失败");
          return;
        }
        db.collection(collection_name).insertOne({username:username,password:password,head_pic:newPath},function(err,data){
          if(err){
            res.send("插入数据失败");
            db.close();
            return;
          }
          db.close();
          // 将信息放入session并跳转页面
          req.session.username = username;
          req.session.head_pic = newPath;
          res.redirect("/main.html");
        });
      });
    });      
  });
})
//检测用户名路由
app.get("/checkusername",function(req,res){
	var username=req.query.username;
	//连接数据库
	mongoClient.connect(connect_str,function(err,db){
		if(err){
			res.send({error:1,data:"连接数据库失败"});
			return;
		}
		//查询数据库
		var obj={username :username};
		db.collection(collection_name).findOne(obj,function(err,data){
			if(err){
				res.send({error:2,data:"查询数据库失败"});
				db.close();
				return;
			}
			if(data===null){
				res.send({error:0,data:"恭喜可以注册"});
			}else{
				res.send({error:3,data:"用户名已经被占用"});
			}
			db.close();
		})
	})
})
//主页路由
app.get("/main.html",function(req,res){
	res.render("./main.ejs",{
		username:req.session.username,
		head_pic:req.session.head_pic,
		quanxian:req.session.quanxian
	})
})
//退出路由
app.get("/exit",function(req,res){
	req.session.username = "";
  	res.redirect("/index.html");
})
//socket.io
//定义一个变量来存储所有用户名
var collection={};
var aaa="";
io.on("connection",function(socket){
	//注册sendSelfInfo事件
	socket.on("sendSelfInfo",function(data){
		var username=data.username;
		aaa=username;
		// 将username作为属性值保存，不会丢失
		collection[username]=username;
		//组装好collection后，发给前端
		socket.emit("getUser",collection);
	})
	//注册wolaile事件
	socket.on("wolaile",function(data){
		//通知所有人我来了，刷新用户列表
		io.sockets.emit("getUser",collection);
		// 欢迎事件
		io.sockets.emit("welcome",data);
	})
	//注册离开事件
	socket.on("disconnnect",function(data){
		io.sockets.emit("someonego",{username:aaa});
		delete collection[aaa];
		io.sockets.emit("getUser",collection);
	})
	//注册sendMessage事件
	socket.on("sendMessage",function(data){
		io.sockets.emit("renderMessage",data);
	})
	socket.on("tiren",function(data){
		io.sockets.emit("beiti",data);
	})
})
server.listen(3000);