import { Faker, pt_BR, pt_PT, en, es, fr, it, de, nl, faker as fakerEN } from "@faker-js/faker";

class FakerUtils {
    public static getFakerByNation = (nation: string): Faker => {
        switch (nation) {
            case "Brazil": return new Faker({ locale: [pt_BR] });
            case "Argentina": return new Faker({ locale: [es] });
            case "Spain": return new Faker({ locale: [es] });
            case "France": return new Faker({ locale: [fr] });
            case "Germany": return new Faker({ locale: [de] });
            case "Italy": return new Faker({ locale: [it] });
            case "Netherlands": return new Faker({ locale: [nl] });
            case "Belgium": return new Faker({ locale: [nl, fr, de] });
            case "Portugal": return new Faker({ locale: [pt_PT] });
            case "England":
            default:
                return new Faker({ locale: [en] });
        }
    };
}

export default FakerUtils;