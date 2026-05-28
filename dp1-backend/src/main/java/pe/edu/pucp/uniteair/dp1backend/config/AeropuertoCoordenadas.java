package pe.edu.pucp.uniteair.dp1backend.config;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class AeropuertoCoordenadas {

    private static final Map<String, double[]> COORDENADAS = new HashMap<>();
    static {
        // Originales
        COORDENADAS.put("SKBO", new double[]{4.7016, -74.1469});
        COORDENADAS.put("SKRG", new double[]{6.1645, -75.4231});
        COORDENADAS.put("SKCL", new double[]{3.5439, -76.3816});
        COORDENADAS.put("SKBQ", new double[]{10.8896, -74.7808});
        COORDENADAS.put("SEGU", new double[]{-2.1574, -79.8836});
        COORDENADAS.put("SPJC", new double[]{-12.0219, -77.1143});
        COORDENADAS.put("SCEL", new double[]{-33.3930, -70.7858});
        COORDENADAS.put("SAEZ", new double[]{-34.8222, -58.5358});
        COORDENADAS.put("SBGR", new double[]{-23.4356, -46.4731});
        COORDENADAS.put("KJFK", new double[]{40.6413, -73.7781});
        COORDENADAS.put("KLAX", new double[]{33.9425, -118.4081});
        COORDENADAS.put("KORD", new double[]{41.9786, -87.9047});
        COORDENADAS.put("KATL", new double[]{33.6407, -84.4277});
        COORDENADAS.put("KDFW", new double[]{32.8998, -97.0403});
        COORDENADAS.put("KMIA", new double[]{25.7932, -80.2906});
        COORDENADAS.put("KSFO", new double[]{37.6213, -122.3790});
        COORDENADAS.put("KSEA", new double[]{47.4489, -122.3094});
        COORDENADAS.put("PHNL", new double[]{21.3245, -157.9251});
        COORDENADAS.put("EGLL", new double[]{51.4700, -0.4543});
        COORDENADAS.put("LFPG", new double[]{49.0097, 2.5479});
        COORDENADAS.put("EDDF", new double[]{50.0379, 8.5622});
        COORDENADAS.put("EHAM", new double[]{52.3105, 4.7683});
        COORDENADAS.put("LEMD", new double[]{40.4983, -3.5676});
        COORDENADAS.put("LIRF", new double[]{41.8002, 12.2388});
        COORDENADAS.put("LSZH", new double[]{47.4582, 8.5480});
        COORDENADAS.put("UUDD", new double[]{55.5918, 37.2674});
        COORDENADAS.put("ULLI", new double[]{59.8003, 30.2625});
        COORDENADAS.put("RJTT", new double[]{35.5494, 139.7798});
        COORDENADAS.put("RKSI", new double[]{37.4602, 126.4407});
        COORDENADAS.put("ZSPD", new double[]{31.1443, 121.8083});
        COORDENADAS.put("VHHH", new double[]{22.3080, 113.9185});
        COORDENADAS.put("WSSS", new double[]{1.3592, 103.9894});
        COORDENADAS.put("OMDB", new double[]{25.2532, 55.3657});
        COORDENADAS.put("OTHH", new double[]{25.2606, 51.6140});
        COORDENADAS.put("VIDP", new double[]{28.5562, 77.1000});
        COORDENADAS.put("FAOR", new double[]{-26.1392, 28.2460});
        COORDENADAS.put("CYYZ", new double[]{43.6777, -79.6248});
        COORDENADAS.put("MMMX", new double[]{19.4363, -99.0721});
        // Dataset husos adicionales
        COORDENADAS.put("EBCI", new double[]{50.4592, 4.4536});
        COORDENADAS.put("EDDI", new double[]{52.4736, 13.4017});
        COORDENADAS.put("EKCH", new double[]{55.6181, 12.6561});
        COORDENADAS.put("LATI", new double[]{41.4147, 19.7206});
        COORDENADAS.put("LBSF", new double[]{42.6903, 23.4047});
        COORDENADAS.put("LDZA", new double[]{45.7428, 16.0686});
        COORDENADAS.put("LKPR", new double[]{50.1014, 14.2656});
        COORDENADAS.put("LOWW", new double[]{48.1108, 16.5708});
        COORDENADAS.put("OAKB", new double[]{34.5656, 69.2108});
        COORDENADAS.put("OERK", new double[]{24.9578, 46.6989});
        COORDENADAS.put("OJAI", new double[]{31.7225, 35.9933});
        COORDENADAS.put("OOMS", new double[]{23.5894, 58.2842});
        COORDENADAS.put("OPKC", new double[]{24.9000, 67.1500});
        COORDENADAS.put("OSDI", new double[]{33.4114, 36.5156});
        COORDENADAS.put("OYSN", new double[]{15.4761, 44.2197});
        COORDENADAS.put("SABE", new double[]{-34.5592, -58.4156});
        COORDENADAS.put("SBBR", new double[]{-15.8647, -47.9181});
        COORDENADAS.put("SEQM", new double[]{0.1133, -78.3586});
        COORDENADAS.put("SGAS", new double[]{-25.2400, -57.5200});
        COORDENADAS.put("SLLP", new double[]{-16.5131, -68.1922});
        COORDENADAS.put("SPIM", new double[]{-12.0219, -77.1144});
        COORDENADAS.put("SUAA", new double[]{-34.7892, -56.2647});
        COORDENADAS.put("SVMI", new double[]{10.6031, -66.9906});
        COORDENADAS.put("UBBB", new double[]{40.4672, 50.0467});
        COORDENADAS.put("UMMS", new double[]{53.8825, 28.0325});
    }

    private AeropuertoCoordenadas() {
        // util class
    }

    public static double[] get(String codigoOACI) {
        return COORDENADAS.getOrDefault(codigoOACI, new double[]{0, 0});
    }
}
