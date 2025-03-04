import { Schema, Document, model } from "mongoose";

type TaCSchema = Document & {
  text: string;
};

const tacSchema = new Schema<TaCSchema>({
  text: {
    type: String,
  },
});

const TaC = model<TaCSchema>("TaC", tacSchema);
export default TaC;
