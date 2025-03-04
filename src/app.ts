import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { notFound } from "@middlewares/notfound";
import { errorHandler } from "@middlewares/errorHandler";
import { requestLogger } from "@middlewares/requestLogger";
import AuthRouter from "@routers/authRouter";
import UserRouter from "@routers/userRouter";
import TaCRouter from "@routers/tacRouter";
import PrivacyRouter from "@routers/privacyRouter";
import AdminRouter from "@routers/adminRouter";
import BarRouter from "@routers/barRouter";
import HomeRouter from "@routers/homeRouter";
import FavoriteRouter from "@routers/favoriteRouter";


const app = express();
app.use(requestLogger);
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true
  })
);

const routes = [
  { path: "/admin", router: AdminRouter },
  { path: "/auth", router: AuthRouter },
  { path: "/user", router: UserRouter },
  { path: "/tac", router: TaCRouter },
  { path: "/privacy", router: PrivacyRouter },
  { path: "/bar", router: BarRouter },
  { path: "/home", router: HomeRouter },
  { path: "/favorite", router: FavoriteRouter }
];

routes.forEach((route) => {
  app.use(route.path, route.router);
});

app.use("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello From the basic server");
});

app.use("/**", notFound);

app.use(errorHandler);

export default app;
