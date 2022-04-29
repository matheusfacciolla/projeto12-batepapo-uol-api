import Joi from "joi";

const schema = Joi.object({
    name: Joi
        .string()
        .alphanum()
        .required(),

    to: Joi
        .string()
        .alphanum()
        .required(),
    
    text: Joi
        .string()
        .alphanum()
        .required()
});

export default schema;