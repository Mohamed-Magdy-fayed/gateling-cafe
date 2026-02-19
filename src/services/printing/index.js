import cors from "cors";
import express from "express";
import {
    CharacterSet,
    PrinterTypes,
    ThermalPrinter,
} from "node-thermal-printer";

const app = express();
const PORT = 7899;
const HOST = "127.0.0.1";

// Allow local Next.js app to call the printer service
app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    }),
);

app.use(express.json());

/**
 * Health check
 */
app.get("/", (req, res) => {
    res.json({ status: "Printer service running" });
});

/**
 * Print endpoint
 * Expected payload:
 * {
 *   "interface": "printer:Microsoft Print to PDF",
 *   "order": {
 *     "shopName": "My Shop",
 *     "orderNumber": "12345",
 *     "orderDate": "2026-02-15",
 *     "orderTotal": 250,
 *     "items": [
 *       {
 *         "name": "Burger",
 *         "quantity": 2,
 *         "pricePerUnit": 50,
 *         "lineTotal": 100
 *       }
 *     ]
 *   }
 * }
 */
app.post("/print", async (req, res) => {
    console.log(req.body);

    try {
        const { interface: printerInterface, order } = req.body;

        if (!printerInterface || !order) {
            return res.status(400).json({
                error: "Missing interface or order data",
            });
        }

        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON, // Most thermal printers use EPSON ESC/POS
            interface: printerInterface,
            characterSet: CharacterSet.PC852_LATIN2,
            removeSpecialCharacters: false,
            lineCharacter: "-",
        });

        const isConnected = await printer.isPrinterConnected();

        if (!isConnected) {
            return res.status(500).json({
                error: "Printer not connected or invalid interface",
            });
        }

        // ---------- PRINT LAYOUT ----------

        printer.alignCenter();
        printer.bold(true);
        printer.println(order.shopName);
        printer.bold(false);

        printer.drawLine();

        printer.alignLeft();
        printer.println(`Order #: ${order.orderNumber}`);
        printer.println(`Date   : ${order.orderDate}`);

        printer.drawLine();

        order.items.forEach((item) => {
            printer.println(item.name);
            printer.rightLeft(
                `${item.quantity} x ${item.pricePerUnit}`,
                item.lineTotal.toString(),
            );
        });

        printer.drawLine();

        printer.bold(true);
        printer.rightLeft("TOTAL", order.orderTotal.toString());
        printer.bold(false);

        printer.newLine();
        printer.alignCenter();
        printer.println("Thank you!");
        printer.newLine();

        printer.cut();

        await printer.execute();

        return res.json({
            success: true,
            message: "Print job sent successfully",
        });
    } catch (error) {
        console.error("PRINT ERROR:", error);

        return res.status(500).json({
            error: "Printing failed",
            details: error.message,
        });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`Thermal printer service running at http://${HOST}:${PORT}`);
});
