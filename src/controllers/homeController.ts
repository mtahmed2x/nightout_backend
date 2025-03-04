import { Request, Response, NextFunction } from "express";
import Bar from "@models/barModels";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import { fetchNearbyVenues, buildBarObject } from "@services/barServices";
import Favorite from "@models/favoriteModel";

const home = async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  const userId = req.user.userId;
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const radius = 3000;
  const skip = (page - 1) * limit;

  if (!lat || !lng) {
    throw createError(StatusCodes.BAD_REQUEST, "Latitude and longitude are required.");
  }

  const venues = await fetchNearbyVenues(lat, lng, radius);
  console.log(venues);
  const resultBars: any[] = [];

  for (const venue of venues) {
    const existingBar = await Bar.findOne({ placeId: venue.place_id });
    if (existingBar) {
      resultBars.push(existingBar);
    } else {
      const newBarData = await buildBarObject(venue, lat, lng);
      console.log(newBarData.about.schedule);
      const newBar = new Bar(newBarData);
      await newBar.save();
      resultBars.push(newBar);
    }
  }

  const sortedBars = resultBars.sort((a, b) => {
    if (b.total_reviewer !== a.total_reviewer) {
      return b.total_reviewer - a.total_reviewer;
    }
    return b.average_rating - a.average_rating;
  });

  const now = new Date();
  const weekday = now.toLocaleString('en-US', { weekday: 'short' });
  const day = now.getDate().toString().padStart(2, '0');
  const month = now.toLocaleString('en-US', { month: 'short' });
  const year = now.getFullYear();
  const formattedDate = `${weekday}, ${day} ${month}, ${year}`;
  const currentDay = weekday;

  sortedBars.forEach(bar => {
    bar.currentDate = formattedDate;

    let closeTime = "";
    if (bar.about.schedule && Array.isArray(bar.about.schedule)) {
      const todaySchedule = bar.about.schedule.find((item: { day: string; }) => item.day.toLowerCase() === currentDay.toLowerCase());
      if (todaySchedule && todaySchedule.time) {
        const parts = todaySchedule.time.split("–");
        if (parts.length >= 2) {
          closeTime = parts[1].trim();
        }
      }
    }
    bar.closeTime = closeTime;
  });

  const topBars = sortedBars.slice(0, 4);
  const simplifiedTopBars = topBars.map(bar => ({
    _id: bar.id,
    cover: bar.cover,
    barType: bar.barType,
    name: bar.name,
    crowdMeter: bar.crowdMeter,
    currentDate: bar.currentDate,
    closeTime: bar.closeTime,
  }));


  const remainingBars = sortedBars.slice(4);
  const bars = await Promise.all(
    remainingBars.map(async (bar) => {
      const favoriteEntry = await Favorite.findOne({ user: userId, bar: bar.id });
      return {
        _id: bar.id,
        gallery: [bar.cover, ...bar.gallery],
        barType: bar.barType,
        name: bar.name,
        address: bar.about.address.placeName,
        currentDate: bar.currentDate,
        time: bar.about.schedule[0]?.time || "",
        ...(favoriteEntry ? { isFavorite: true } : {isFavorite: false}),
      };
    })
  );
  // const bars = remainingBars.map(bar => ({
  //   _id: bar.id,
  //   gallery: [bar.cover, ...bar.gallery],
  //   barType: bar.barType,
  //   name: bar.name,
  //   address: bar.about.address.placeName,
  //   currentDate: bar.currentDate,
  //   time: bar.about.schedule[0]?.time || "",
  // }))

  const paginatedBars = bars.slice(skip, skip + limit);
  const total = bars.length;
  const totalPages = Math.ceil(total / limit);

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Bar created successfully.",
    data: {
      top: simplifiedTopBars,
      bars: paginatedBars,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
};
const HomeController = {
  home
};
export default HomeController;